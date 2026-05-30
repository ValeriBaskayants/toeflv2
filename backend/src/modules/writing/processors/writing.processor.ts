import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import nlp from 'compromise';

interface LTReplacement {
  value: string;
}

interface LTContext {
  text: string;
  offset: number;
  length: number;
}

interface LTRule {
  issueType: string;
  category: { id: string };
}

interface LTMatch {
  message: string;
  context: LTContext;
  offset: number;
  length: number;
  replacements: LTReplacement[];
  rule: LTRule;
}

interface LTResponse {
  matches: LTMatch[];
}

interface AnalysisJobData {
  submissionId: string;
  text: string;
  minWords: number;
  userLevel: string;
}

const LEVEL_ERROR_THRESHOLDS: Readonly<Record<string, number>> = {
  A1: 20,
  A1_PLUS: 16,
  A2: 13,
  A2_PLUS: 10,
  B1: 8,
  B1_PLUS: 6,
  B2: 4,
  B2_PLUS: 3,
  C1: 2,
  C2: 1,
} as const;

const CRITICAL_ISSUE_TYPES = new Set(['misspelling', 'grammar', 'syntax']);
const CRITICAL_CATEGORY_IDS = new Set(['TYPOS']);

const CONNECTORS = [
  'however',
  'therefore',
  'furthermore',
  'moreover',
  'consequently',
  'nevertheless',
  'although',
  'whereas',
  'in addition',
  'similarly',
] as const;

const CONNECTOR_REGEXES = CONNECTORS.map((c) => new RegExp(`\\b${c}\\b`, 'i'));

@Processor('writing-analysis')
export class WritingProcessor extends WorkerHost {
  private readonly logger = new Logger(WritingProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<AnalysisJobData>): Promise<void> {
    if (job.name !== 'analyze') {
      return;
    }

    const { submissionId, text, minWords, userLevel } = job.data;

    try {
      const doc = nlp(text);
      const wordsArray: string[] = doc.terms().out('array');
      const words = Math.max(1, wordsArray.length);
      const sentences = Math.max(1, doc.sentences().out('array').length);

      const res = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          text,
          language: 'en-US',
          enabledOnly: 'false',
        }).toString(),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        throw new Error(`LanguageTool returned ${res.status}`);
      }

      const data: LTResponse = (await res.json()) as LTResponse;
      const matches: LTMatch[] = data.matches;

      const criticalErrors = matches.filter(
        (m) =>
          CRITICAL_ISSUE_TYPES.has(m.rule?.issueType) ||
          CRITICAL_CATEGORY_IDS.has(m.rule?.category?.id),
      );
      const errorCount = criticalErrors.length;

      const errorThreshold = LEVEL_ERROR_THRESHOLDS[userLevel] ?? 10;
      const errorDensity = (errorCount / words) * 100;
      const grammarScore = Math.max(0, Math.round(100 - (errorDensity / errorThreshold) * 50));

      const wordRatio = Math.min(1, words / minWords);
      const taskScore = wordRatio < 0.9 ? Math.round(wordRatio * 80) : 100;

      const uniqueWords = new Set(wordsArray.map((w) => w.toLowerCase())).size;
      const guiraudIndex = uniqueWords / Math.sqrt(words);
      const vocabularyScore = Math.min(100, Math.round((guiraudIndex / 7) * 100));

      const connectorCount = CONNECTOR_REGEXES.filter((re) => re.test(text)).length;

      const avgWordsPerSentence = words / sentences;
      let coherenceScore = 70;

      if (avgWordsPerSentence >= 12 && avgWordsPerSentence <= 25) {
        coherenceScore += 15;
      }
      if (connectorCount >= 3) {
        coherenceScore += 15;
      }
      if (avgWordsPerSentence < 10) {
        coherenceScore -= (10 - avgWordsPerSentence) * 4;
      } else if (avgWordsPerSentence > 30) {
        coherenceScore -= (avgWordsPerSentence - 30) * 2;
      }
      coherenceScore = Math.max(40, Math.min(100, Math.round(coherenceScore)));

      const overallScore = Math.round(
        grammarScore * 0.35 + taskScore * 0.3 + vocabularyScore * 0.2 + coherenceScore * 0.15,
      );

      const feedbackParts: string[] = [];
      if (grammarScore < 70)
        feedbackParts.push('Review basic grammar rules and check your spelling carefully.');
      if (wordRatio < 0.9)
        feedbackParts.push(`Your response is a bit short — aim for at least ${minWords} words.`);
      if (vocabularyScore < 60)
        feedbackParts.push('Try using synonyms to avoid repetition and enrich your vocabulary.');
      if (coherenceScore < 75)
        feedbackParts.push(
          'Connect ideas with discourse markers like "moreover" or "consequently".',
        );
      if (feedbackParts.length === 0) {
        feedbackParts.push('Excellent work! Your structure and vocabulary are well-balanced.');
      }

      const analysis = {
        overallScore,
        grammarScore,
        taskScore,
        vocabularyScore,
        coherenceScore,
        wordCount: words,
        errorCount,
        feedback: feedbackParts.join(' '),
        detectedTone: guiraudIndex > 5.5 ? 'Academic' : 'Conversational',
        errors: matches.slice(0, 15).map((e) => ({
          message: e.message,
          context: e.context?.text ?? '',
          offset: e.offset,
          length: e.length,
          replacements: e.replacements.slice(0, 3).map((r) => r.value),
        })),
      };

      await this.prisma.writingSubmission.update({
        where: { id: submissionId },
        data: { analysis, status: 'ANALYZED' },
      });
    } catch (error: unknown) {
      this.logger.error('WRITING_ANALYSIS_FAILED', {
        submissionId,
        attempt: job.attemptsMade,
        error: error instanceof Error ? error.message : String(error),
      });

      if (job.attemptsMade >= 2) {
        await this.prisma.writingSubmission.update({
          where: { id: submissionId },
          data: { status: 'ERROR' },
        });
      }

      throw error;
    }
  }
}
