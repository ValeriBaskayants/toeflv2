import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { RedisService } from '../redis/redis.service';

const GEMINI_MODEL = 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 20_000;
const CACHE_TTL_SEC = 60 * 60 * 24 * 30;
const DAILY_SAFETY_LIMIT = 1200;

export interface LexicalIssue {
  trigger: string;
  pattern: string;
  coreReason: string;
  category: 'calque' | 'tautology' | 'pleonasm' | 'other';
}

export interface GrammarIssue {
  trigger: string;
  pattern: string;
  coreReason: string;
  category: 'tense' | 'article' | 'structure' | 'other';
}

export interface TopicAdherenceResult {
  onTopic: boolean;
  reason: string;
}

export interface ClinicalAuditResult {
  sectionB: LexicalIssue[];
  sectionC: GrammarIssue[];
  topicAdherence?: TopicAdherenceResult;
}

export interface TopicContext {
  core: string;
  constraint: string;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

@Injectable()
export class GeminiWritingService {
  private readonly logger = new Logger(GeminiWritingService.name);
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.apiKey = this.config.getOrThrow<string>('gemini.apiKey');
  }

  async runClinicalAudit(text: string, topicContext?: TopicContext): Promise<ClinicalAuditResult> {
    const cacheSeed = topicContext ? `${text}::${topicContext.core}::${topicContext.constraint}` : text;
    const contentHash = createHash('sha256').update(cacheSeed).digest('hex');
    const cacheKey = `gemini:audit:${contentHash}`;

    const cached = await this.redis.get(cacheKey);
    if (cached !== null) {
      return JSON.parse(cached) as ClinicalAuditResult;
    }

    await this.enforceDailyBudget();

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: this.buildPrompt(text, topicContext) }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );

      if (!response.ok) {
        this.logger.error('GEMINI_REQUEST_FAILED', { status: response.status });
        throw new HttpException('Semantic analysis service unavailable.', HttpStatus.SERVICE_UNAVAILABLE);
      }

      const data = (await response.json()) as GeminiResponse;
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

      let parsed: ClinicalAuditResult;
      try {
        parsed = JSON.parse(rawText) as ClinicalAuditResult;
      } catch {
        this.logger.error('GEMINI_INVALID_JSON', { rawText: rawText.slice(0, 200) });
        parsed = { sectionB: [], sectionC: [] };
      }

      await this.redis.set(cacheKey, JSON.stringify(parsed), CACHE_TTL_SEC);
      return parsed;
    } catch (err: unknown) {
      await this.redis.incrbyfloat(this.dailyRedisKey(), -1);
      throw err;
    }
  }

  private buildPrompt(text: string, topicContext?: TopicContext): string {
    const topicInstruction = topicContext
      ? `\n\nAlso judge topic adherence. The task requires staying strictly within this narrow angle (not just the general topic): "${topicContext.constraint}" (general topic: "${topicContext.core}"). If the text drifts into the general topic without addressing this specific angle, mark it as off-topic.\nAdd this field to the JSON: "topicAdherence": {"onTopic": true or false, "reason": "one sentence explanation"}.`
      : '';

    return `You are a strict C1/C2 academic English writing examiner. Analyze the text below for exactly two categories of errors. Do not comment on spelling or punctuation — that is handled separately.

Section B (Lexical): calques (word-for-word translations from another language that sound unnatural in English), tautology, pleonasm.
Section C (Grammar): tense agreement errors, article errors, awkward sentence structure.

For each error found, return an object with: "trigger" (the exact phrase as written), "pattern" (the corrected academic C1/C2 version), "coreReason" (one clear sentence explaining the rule), "category".${topicInstruction}

Return ONLY valid JSON in this exact shape, no markdown formatting, no explanation outside the JSON:
{"sectionB": [{"trigger": "...", "pattern": "...", "coreReason": "...", "category": "calque"}], "sectionC": [{"trigger": "...", "pattern": "...", "coreReason": "...", "category": "tense"}]${topicContext ? ', "topicAdherence": {"onTopic": true, "reason": "..."}' : ''}}

If no errors are found in a section, return an empty array for it.

TEXT TO ANALYZE:
"""
${text.slice(0, 4000)}
"""`;
  }

  private async enforceDailyBudget(): Promise<void> {
    const key = this.dailyRedisKey();
    const count = await this.redis.incrbyfloat(key, 1);
    await this.redis.expire(key, 26 * 60 * 60);

    if (count > DAILY_SAFETY_LIMIT) {
      await this.redis.incrbyfloat(key, -1);
      throw new HttpException(
        'Daily semantic analysis quota reached. Please try again tomorrow.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private dailyRedisKey(): string {
    const pacificDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
    return `gemini:rpd:${pacificDate}`;
  }
}