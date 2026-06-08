import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import {
  computeXP,
  XP_BASE,
  getStreakMultiplier,
  isSessionCountable,
} from '../../../constants/level-requirements';
import nlp from 'compromise';

// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGETOOL TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface LTReplacement { value: string }
interface LTContext     { text: string; offset: number; length: number }
interface LTRule        { issueType: string; category: { id: string } }
interface LTMatch {
  message:      string;
  context:      LTContext;
  offset:       number;
  length:       number;
  replacements: LTReplacement[];
  rule:         LTRule;
}
interface LTResponse { matches: LTMatch[] }

// ─────────────────────────────────────────────────────────────────────────────
// JOB PAYLOAD
// ─────────────────────────────────────────────────────────────────────────────

interface AnalysisJobData {
  submissionId:        string;
  text:                string;
  minWords:            number;
  userLevel:           string;
  streak:              number;
  attemptCount:        number;
  maxCountedAttempts:  number;
  timezone?:           string;
}

const LEVEL_SENSITIVITY: Readonly<Record<string, number>> = {
  A1:      1.5,
  A1_PLUS: 1.8,
  A2:      2.0,
  A2_PLUS: 2.3,
  B1:      2.5,
  B1_PLUS: 2.8,
  B2:      3.0,
  B2_PLUS: 3.3,
  C1:      3.7,
  C2:      4.0,
} as const;

const CONNECTORS = [
  'however', 'therefore', 'furthermore', 'moreover', 'consequently',
  'nevertheless', 'although', 'whereas', 'in addition', 'similarly',
  'in contrast', 'on the other hand', 'as a result', 'in conclusion',
  'for example', 'for instance', 'in particular', 'to summarize',
  'firstly', 'secondly', 'finally', 'additionally', 'subsequently',
] as const;

const CONNECTOR_REGEXES = CONNECTORS.map((c) => new RegExp(`\\b${c}\\b`, 'i'));

const CRITICAL_ISSUE_TYPES  = new Set(['misspelling', 'grammar', 'syntax']);
const CRITICAL_CATEGORY_IDS = new Set(['TYPOS', 'GRAMMAR']);

@Processor('writing-analysis')
export class WritingProcessor extends WorkerHost {
  private readonly logger = new Logger(WritingProcessor.name);

  constructor(
    private readonly prisma:    PrismaService,
    private readonly progress:  ProgressService,
  ) {
    super();
  }

  async process(job: Job<AnalysisJobData>): Promise<void> {
    if (job.name !== 'analyze') return;

    const {
      submissionId,
      text,
      minWords,
      userLevel,
      streak,
      attemptCount,
      maxCountedAttempts,
      timezone,
    } = job.data;

    try {
      const doc        = nlp(text);
      const wordsArray = doc.terms().out('array') as string[];
      const words      = Math.max(1, wordsArray.length);
      const sentences  = Math.max(1, (doc.sentences().out('array') as string[]).length);

      const res = await fetch('https://api.languagetool.org/v2/check', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({
          text,
          language:    'en-US',
          enabledOnly: 'false',
        }).toString(),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) throw new Error(`LanguageTool returned ${res.status}`);

      const data: LTResponse = await res.json() as LTResponse;

      const criticalErrors = data.matches.filter(
        (m) =>
          CRITICAL_ISSUE_TYPES.has(m.rule?.issueType) ||
          CRITICAL_CATEGORY_IDS.has(m.rule?.category?.id),
      );
      const errorCount = criticalErrors.length;

      const errorRate    = errorCount / words;
      const sensitivity  = LEVEL_SENSITIVITY[userLevel] ?? 2.5;
      const grammarScore = Math.max(0, Math.round(100 * Math.pow(1 - errorRate, sensitivity)));

      const wordRatio  = words / minWords;
      const taskScore  = wordRatio < 0.9
        ? Math.round(wordRatio * 85)          
        : Math.min(100, Math.round(85 + (wordRatio - 0.9) * 50)); 

      const levelVocabNorm: Record<string, number> = {
        A1: 5, A1_PLUS: 5.5, A2: 6, A2_PLUS: 6.5,
        B1: 7, B1_PLUS: 7, B2: 7.5, B2_PLUS: 8, C1: 8, C2: 8,
      };
      const norm          = levelVocabNorm[userLevel] ?? 7;
      const uniqueWords   = new Set(wordsArray.map((w) => w.toLowerCase())).size;
      const guiraudIndex  = uniqueWords / Math.sqrt(words);
      const vocabularyScore = Math.min(100, Math.round((guiraudIndex / norm) * 100));

      const connectorCount    = CONNECTOR_REGEXES.filter((re) => re.test(text)).length;
      const avgWordsPerSent   = words / sentences;

      let coherenceScore = 60;

      const isHighLevel    = ['B2', 'B2_PLUS', 'C1', 'C2'].includes(userLevel);
      const optLow  = isHighLevel ? 15 : 10;
      const optHigh = isHighLevel ? 25 : 20;

      if (avgWordsPerSent >= optLow && avgWordsPerSent <= optHigh) {
        coherenceScore += 20; 
      } else if (avgWordsPerSent < optLow) {
        coherenceScore -= Math.min(20, (optLow - avgWordsPerSent) * 3); 
      } else {
        coherenceScore -= Math.min(20, (avgWordsPerSent - optHigh) * 2); 
      }

      coherenceScore += Math.min(20, connectorCount * 5);

      if (sentences >= 3) coherenceScore += 5;
      if (sentences >= 6) coherenceScore += 5;

      coherenceScore = Math.max(30, Math.min(100, Math.round(coherenceScore)));

      const overallScore = Math.round(
        grammarScore * 0.35 +
        taskScore    * 0.30 +
        vocabularyScore * 0.20 +
        coherenceScore  * 0.15,
      );

      const feedback = buildFeedback({
        grammarScore,
        taskScore,
        vocabularyScore,
        coherenceScore,
        overallScore,
        wordCount:     words,
        minWords,
        errorCount,
        connectorCount,
        guiraudIndex,
        avgWordsPerSent,
      });

      const analysis = {
        overallScore,
        grammarScore,
        taskScore,
        vocabularyScore,
        coherenceScore,
        wordCount:    words,
        errorCount,
        feedback,
        detectedTone: guiraudIndex > (LEVEL_SENSITIVITY[userLevel] ?? 2.5) + 2
          ? 'Academic'
          : guiraudIndex > 5
            ? 'Semi-formal'
            : 'Conversational',
        errors: data.matches.slice(0, 15).map((e) => ({
          message:      e.message,
          context:      e.context?.text ?? '',
          offset:       e.offset,
          length:       e.length,
          replacements: e.replacements.slice(0, 3).map((r) => r.value),
        })),
      };

      await this.prisma.writingSubmission.update({
        where: { id: submissionId },
        data:  { analysis, status: 'ANALYZED' },
      });

      const isCountedAttempt = attemptCount < maxCountedAttempts;
      const xpMultiplier     = isCountedAttempt ? 1.0 : 0.2;

      const baseXp   = Math.round(
        (XP_BASE.WRITING_BASE + overallScore * XP_BASE.WRITING_SCORE_MULT) * xpMultiplier,
      );
      const xpEarned = computeXP({
        base:     baseXp,
        streak,
        accuracy: overallScore,
      });

      if (isCountedAttempt) {
        await this.progress.recordWritingCompletion({
          userId:   (await this.prisma.writingSubmission.findUnique({
            where:  { id: submissionId },
            select: { userId: true },
          }))!.userId,
          score:    overallScore,
          xpEarned,
          timezone,
        });
      } else {
        const sub = await this.prisma.writingSubmission.findUnique({
          where:  { id: submissionId },
          select: { userId: true },
        });
        if (sub !== null) {
          await this.progress.recordActivity({
            userId:       sub.userId,
            xpEarned,
            minutesSpent: 5,
            timezone,
          });
        }
      }

    } catch (error: unknown) {
      this.logger.error('WRITING_ANALYSIS_FAILED', {
        submissionId,
        attempt: job.attemptsMade,
        error:   error instanceof Error ? error.message : String(error),
      });

      if (job.attemptsMade >= 2) {
        await this.prisma.writingSubmission.update({
          where: { id: submissionId },
          data:  { status: 'ERROR' },
        });
      }

      throw error; 
    }
  }
}

interface FeedbackParams {
  grammarScore:     number;
  taskScore:        number;
  vocabularyScore:  number;
  coherenceScore:   number;
  overallScore:     number;
  wordCount:        number;
  minWords:         number;
  errorCount:       number;
  connectorCount:   number;
  guiraudIndex:     number;
  avgWordsPerSent:  number;
}

function buildFeedback(p: FeedbackParams): string {
  const parts: string[] = [];

  if (p.grammarScore >= 90) {
    parts.push('Grammar is excellent with very few errors.');
  } else if (p.grammarScore >= 75) {
    parts.push(`Grammar is good (${p.errorCount} issue${p.errorCount !== 1 ? 's' : ''} found). Review the highlighted errors below.`);
  } else if (p.grammarScore >= 55) {
    parts.push(`Grammar needs work — ${p.errorCount} errors detected. Focus on verb tenses and subject-verb agreement.`);
  } else {
    parts.push(`Grammar score is low (${p.errorCount} errors). Consider reviewing basic grammar rules before resubmitting.`);
  }

  if (p.taskScore < 85) {
    const missing = p.minWords - p.wordCount;
    parts.push(`Your response is ${p.wordCount} words — add approximately ${Math.max(0, missing)} more words to fully address the prompt.`);
  }

  if (p.vocabularyScore < 50) {
    parts.push('Vocabulary is limited — try using more varied words and avoid repeating the same terms.');
  } else if (p.vocabularyScore >= 80) {
    parts.push('Vocabulary range is strong with good lexical diversity.');
  }

  if (p.coherenceScore < 55) {
    parts.push(
      p.connectorCount === 0
        ? 'Add discourse markers (however, therefore, moreover) to connect your ideas.'
        : `Use more varied connectors — you used ${p.connectorCount}, aim for at least 3–4 different ones.`,
    );
  } else if (p.avgWordsPerSent < 8) {
    parts.push('Your sentences are very short — try combining some into more complex structures.');
  }

  if (p.overallScore >= 80) {
    parts.push('Overall excellent writing — you are demonstrating strong English proficiency.');
  } else if (p.overallScore >= 65) {
    parts.push('Good effort overall — keep practicing to raise your score above 80.');
  }

  return parts.join(' ');
}