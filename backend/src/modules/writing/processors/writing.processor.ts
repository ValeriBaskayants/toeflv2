import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ProgressService } from '../../progress/progress.service';
import { computeXP, XP_BASE } from '../../../constants/level-requirements';
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

interface DiscussionPeerResponse {
  authorName: string;
  text: string;
}

interface AnalysisJobData {
  submissionId: string;
  text: string;
  minWords: number;
  writingType?: string;
  promptText?: string;
  discussionPeerResponses?: DiscussionPeerResponse[];
  userLevel: string;
  streak: number;
  attemptCount: number;
  maxCountedAttempts: number;
  timezone?: string;
}

const LEVEL_SENSITIVITY: Readonly<Record<string, number>> = {
  A1: 1.5,
  A1_PLUS: 1.8,
  A2: 2.0,
  A2_PLUS: 2.3,
  B1: 2.5,
  B1_PLUS: 2.8,
  B2: 3.0,
  B2_PLUS: 3.3,
  C1: 3.7,
  C2: 4.0,
};

const CONNECTORS = [
  'however', 'therefore', 'furthermore', 'moreover', 'consequently', 'nevertheless',
  'although', 'whereas', 'in addition', 'similarly', 'in contrast', 'on the other hand',
  'as a result', 'in conclusion', 'for example', 'for instance', 'in particular',
  'to summarize', 'firstly', 'secondly', 'finally', 'additionally', 'subsequently',
] as const;
const CONNECTOR_REGEXES = CONNECTORS.map((c) => new RegExp(`\\b${c}\\b`, 'i'));

const TOLERATED_TYPOS = 1;
const BORROWED_SHINGLE_SIZE = 5;
const BORROWED_HEAVY_THRESHOLD = 0.5;
const BORROWED_SCORE_CAP = 30;

function normalizeWords(text: string): string[] {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean);
}

function computeBorrowedRatio(responseText: string, sourceTexts: string[]): number {
  const responseWords = normalizeWords(responseText);
  if (responseWords.length < BORROWED_SHINGLE_SIZE) return 0;

  const sourceShingles = new Set<string>();
  for (const src of sourceTexts) {
    const words = normalizeWords(src);
    for (let i = 0; i <= words.length - BORROWED_SHINGLE_SIZE; i++) {
      sourceShingles.add(words.slice(i, i + BORROWED_SHINGLE_SIZE).join(' '));
    }
  }
  if (sourceShingles.size === 0) return 0;

  let borrowed = 0;
  let total = 0;
  for (let i = 0; i <= responseWords.length - BORROWED_SHINGLE_SIZE; i++) {
    total++;
    if (sourceShingles.has(responseWords.slice(i, i + BORROWED_SHINGLE_SIZE).join(' '))) borrowed++;
  }
  return total === 0 ? 0 : borrowed / total;
}

// Display-only projection onto the official 0-5 band — ETS does not publish a 0-100 scale.
function mapToOfficialBand(overallScore: number): number {
  if (overallScore >= 90) return 5;
  if (overallScore >= 75) return 4;
  if (overallScore >= 55) return 3;
  if (overallScore >= 35) return 2;
  if (overallScore >= 15) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Таксономия из ets.org/erater/how.html и Chen, Zhang & Bejar (2017),
// "e-rater GUMS Microfeatures", ETS RR-17-04. Точные регрессионные веса и NLP-модели
// e-rater — проприетарные и нигде не опубликованы; здесь воспроизводится только
// опубликованная ТАКСОНОМИЯ макропризнаков и опубликованная ФОРМУЛА ошибок
// ("errors ÷ total words"). LanguageTool используется как NLP-бэкенд вместо e-rater.
// ---------------------------------------------------------------------------

type Macrofeature = 'grammar' | 'usage' | 'mechanics' | 'style';

const LT_CATEGORY_TO_MACROFEATURE: Record<string, Macrofeature> = {
  GRAMMAR: 'grammar',
  CONFUSED_WORDS: 'usage',
  COLLOCATIONS: 'usage',
  SEMANTICS: 'usage',
  TYPOS: 'mechanics',
  PUNCTUATION: 'mechanics',
  CASING: 'mechanics',
  TYPOGRAPHY: 'mechanics',
  STYLE: 'style',
  REDUNDANCY: 'style',
  REPETITIONS: 'style',
  COLLOQUIALISMS: 'style',
  PLAIN_ENGLISH: 'style',
};

function classifyMatches(matches: LTMatch[]): Record<Macrofeature, LTMatch[]> {
  const buckets: Record<Macrofeature, LTMatch[]> = { grammar: [], usage: [], mechanics: [], style: [] };
  for (const m of matches) {
    const catId = m.rule?.category?.id ?? '';
    const bucket = LT_CATEGORY_TO_MACROFEATURE[catId] ?? (m.rule?.issueType === 'misspelling' ? 'mechanics' : 'grammar');
    buckets[bucket].push(m);
  }
  return buckets;
}

// Опубликованная формула ETS: "percent of X errors with regard to total number of words".
function errorRateScore(errorCount: number, words: number, sensitivity: number, tolerated = 0): number {
  const counted = Math.max(0, errorCount - tolerated);
  return Math.max(0, Math.round(100 * Math.pow(1 - counted / words, sensitivity)));
}

// Organization / Development / Sentence Variety у e-rater строятся на проприетарном
// discourse-парсере ETS. Ниже — наша прокси-эвристика поверх опубликованной таксономии,
// не претендующая на воспроизведение самого парсера.
const POSITION_MARKERS = [
  /\bi (strongly )?(believe|think|agree|disagree)\b/i,
  /\bin my opinion\b/i,
  /\bi would (like to )?(recommend|suggest|propose)\b/i,
  /\bmy (view|position|stance) is\b/i,
];
const SUPPORT_MARKERS = [
  /\bfor example\b/i, /\bfor instance\b/i, /\bbecause\b/i, /\bsince\b/i,
  /\bsuch as\b/i, /\bspecifically\b/i, /\bone reason\b/i,
];
const SUBORDINATORS = ['although', 'because', 'since', 'while', 'when', 'unless', 'though', 'whereas', 'if'];

function computeOrganizationScore(text: string, sentenceCount: number): number {
  let score = 40;
  if (POSITION_MARKERS.some((re) => re.test(text))) score += 25;
  if (CONNECTOR_REGEXES.filter((re) => re.test(text)).length >= 2) score += 20;
  if (sentenceCount >= 3) score += 15;
  return Math.min(100, score);
}

function computeDevelopmentScore(text: string, words: number): number {
  const supportHits = SUPPORT_MARKERS.filter((re) => re.test(text)).length;
  const hasConcreteDetail = /\b\d+\b/.test(text);
  const score = Math.min(60, supportHits * 20) + (hasConcreteDetail ? 20 : 0) + (words >= 100 ? 20 : 0);
  return Math.min(100, score);
}

function computeSentenceVarietyScore(text: string, sentenceLengths: number[]): number {
  const usedSubordinators = new Set(SUBORDINATORS.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(text)));
  let spreadScore = 0;
  if (sentenceLengths.length >= 2) {
    const mean = sentenceLengths.reduce((a, v) => a + v, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((a, v) => a + (v - mean) ** 2, 0) / sentenceLengths.length;
    spreadScore = Math.min(40, variance * 2);
  }
  return Math.min(100, Math.round(30 + usedSubordinators.size * 12 + spreadScore));
}

// "Prompt-specific vocabulary usage" (у e-rater — content vector analysis против корпуса
// эталонных эссе; у нас такого корпуса нет, поэтому это прямая эвристика пересечения лексики).
function computePromptRelevanceScore(responseText: string, promptText: string): number {
  const promptTerms = new Set(normalizeWords(promptText).filter((w) => w.length > 3));
  if (promptTerms.size === 0) return 100;
  const responseWords = new Set(normalizeWords(responseText));
  const hits = [...promptTerms].filter((t) => responseWords.has(t)).length;
  return Math.round(Math.min(100, (hits / promptTerms.size) * 150));
}

// Task-специфичное измерение — источник другой: это не e-rater, а дословные формулировки
// официальной рубрики ETS для каждого типа задания (Write an Email / Academic Discussion).
const ENGAGEMENT_MARKER_REGEXES = [
  /\bi (also |partially )?agree with\b/i, /\bi disagree\b/i, /\bsimilarly\b/i, /\bin contrast\b/i,
  /\bunlike\b/i, /\bbuilding on\b/i, /\badding to\b/i,
  /\bas .{1,25}(mentioned|said|pointed out|noted|argued)\b/i, /\blike .{1,20}(said|mentioned)\b/i,
];

function computeEngagementScore(text: string, peers: DiscussionPeerResponse[]): number {
  if (peers.length === 0) return 0;
  const lower = text.toLowerCase();
  let score = 0;
  if (peers.some((p) => p.authorName.trim() !== '' && lower.includes(p.authorName.toLowerCase()))) score += 35;
  if (ENGAGEMENT_MARKER_REGEXES.some((re) => re.test(text))) score += 40;
  if (/\b(classmate|my peers?|the other (post|response|student))\b/i.test(text)) score += 25;
  return Math.min(100, score);
}

const CONVENTION_GREETING_REGEX = /^\s*(dear|hi|hello|good (morning|afternoon|evening))\b/i;
const CONVENTION_SIGNOFF_REGEX = /\b(best( regards)?|regards|sincerely|thanks?( you)?|kind regards)\s*,?\s*\S*\s*$/i;
const POLITENESS_MARKERS = [
  /\bcould you\b/i, /\bwould you\b/i, /\bi would appreciate\b/i,
  /\bplease\b/i, /\bi was wondering if\b/i, /\bwould it be possible\b/i,
];

function computeEmailConventionsScore(text: string): number {
  const trimmed = text.trim();
  let score = 0;
  if (CONVENTION_GREETING_REGEX.test(trimmed)) score += 35;
  if (CONVENTION_SIGNOFF_REGEX.test(trimmed)) score += 35;
  if (POLITENESS_MARKERS.some((re) => re.test(text))) score += 30;
  return Math.min(100, score);
}

@Processor('writing-analysis')
export class WritingProcessor extends WorkerHost {
  private readonly logger = new Logger(WritingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {
    super();
  }

  async process(job: Job<AnalysisJobData>): Promise<void> {
    if (job.name !== 'analyze') return;

    const {
      submissionId, text, minWords, writingType, promptText, discussionPeerResponses,
      userLevel, streak, attemptCount, maxCountedAttempts, timezone,
    } = job.data;

    try {
      const doc = nlp(text);
      const wordsArray = doc.terms().out('array') as string[];
      const words = Math.max(1, wordsArray.length);
      const sentenceTexts = doc.sentences().out('array') as string[];
      const sentences = Math.max(1, sentenceTexts.length);
      const sentenceLengths = sentenceTexts.map((s) => s.trim().split(/\s+/).filter(Boolean).length);

      const res = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ text, language: 'en-US', enabledOnly: 'false' }).toString(),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`LanguageTool returned ${res.status}`);
      const data: LTResponse = (await res.json()) as LTResponse;

      const sensitivity = LEVEL_SENSITIVITY[userLevel] ?? 2.5;

      const matchBuckets = classifyMatches(data.matches);
      const grammarSub = errorRateScore(matchBuckets.grammar.length, words, sensitivity);
      const usageSub = errorRateScore(matchBuckets.usage.length, words, sensitivity);
      // ETS rubric: common typos under timed conditions don't count against a top-band response.
      const mechanicsSub = errorRateScore(matchBuckets.mechanics.length, words, sensitivity, TOLERATED_TYPOS);
      const grammarScore = Math.round(grammarSub * 0.5 + usageSub * 0.3 + mechanicsSub * 0.2);

      const countedMechanicsErrors = Math.max(0, matchBuckets.mechanics.length - TOLERATED_TYPOS);
      const errorCount = matchBuckets.grammar.length + matchBuckets.usage.length + countedMechanicsErrors;

      const wordRatio = words / minWords;
      const wordCountAdequacy =
        wordRatio < 0.9 ? Math.round(wordRatio * 85) : Math.min(100, Math.round(85 + (wordRatio - 0.9) * 50));
      const relevanceSub = computePromptRelevanceScore(text, promptText ?? '');
      const taskScore = Math.round(wordCountAdequacy * 0.55 + relevanceSub * 0.45);

      const levelVocabNorm: Record<string, number> = {
        A1: 5, A1_PLUS: 5.5, A2: 6, A2_PLUS: 6.5, B1: 7, B1_PLUS: 7, B2: 7.5, B2_PLUS: 8, C1: 8, C2: 8,
      };
      const norm = levelVocabNorm[userLevel] ?? 7;
      const uniqueWords = new Set(wordsArray.map((w) => w.toLowerCase())).size;
      const guiraudIndex = uniqueWords / Math.sqrt(words);
      const avgWordLen = wordsArray.reduce((a, w) => a + w.length, 0) / Math.max(1, wordsArray.length);
      const wordLengthBonus = Math.max(0, Math.min(15, (avgWordLen - 4) * 10));
      const vocabularyScore = Math.min(100, Math.round((guiraudIndex / norm) * 100 * 0.85 + wordLengthBonus));

      const connectorCount = CONNECTOR_REGEXES.filter((re) => re.test(text)).length;
      const avgWordsPerSent = words / sentences;
      const styleSub = errorRateScore(matchBuckets.style.length, words, sensitivity * 0.6);
      const organizationSub = computeOrganizationScore(text, sentences);
      const developmentSub = computeDevelopmentScore(text, words);
      const varietySub = computeSentenceVarietyScore(text, sentenceLengths);
      const coherenceScore = Math.round(
        styleSub * 0.2 + organizationSub * 0.3 + developmentSub * 0.3 + varietySub * 0.2,
      );

      const isDiscussion = writingType === 'ACADEMIC_DISCUSSION';
      const taskSpecificScore = isDiscussion
        ? computeEngagementScore(text, discussionPeerResponses ?? [])
        : computeEmailConventionsScore(text);

      const sourceTexts = [promptText ?? '', ...(discussionPeerResponses?.map((p) => p.text) ?? [])].filter(Boolean);
      const borrowedRatio = computeBorrowedRatio(text, sourceTexts);

      let overallScore = isDiscussion
        ? Math.round(
            grammarScore * 0.3 + taskScore * 0.25 + coherenceScore * 0.2 + vocabularyScore * 0.1 + taskSpecificScore * 0.15,
          )
        : Math.round(
            grammarScore * 0.3 + taskScore * 0.25 + coherenceScore * 0.15 + vocabularyScore * 0.1 + taskSpecificScore * 0.2,
          );

      let borrowedWarning: string | null = null;
      if (borrowedRatio > BORROWED_HEAVY_THRESHOLD) {
        overallScore = Math.min(overallScore, BORROWED_SCORE_CAP);
        borrowedWarning = 'Much of your response repeats wording directly from the prompt or discussion. On the real test this scores near the bottom of the scale — use your own words.';
      }

      const officialBand = mapToOfficialBand(overallScore);

      const feedback = buildFeedback({
        grammarScore, taskScore, vocabularyScore, coherenceScore, overallScore,
        wordCount: words, minWords, errorCount, connectorCount, guiraudIndex, avgWordsPerSent, borrowedWarning,
      });

      const analysis = {
        overallScore,
        officialBand,
        grammarScore,
        taskScore,
        vocabularyScore,
        coherenceScore,
        taskSpecificScore,
        wordCount: words,
        errorCount,
        feedback,
        detectedTone:
          guiraudIndex > (LEVEL_SENSITIVITY[userLevel] ?? 2.5) + 2 ? 'Academic' : guiraudIndex > 5 ? 'Semi-formal' : 'Conversational',
        errors: data.matches.slice(0, 15).map((e) => ({
          message: e.message,
          context: e.context?.text ?? '',
          offset: e.offset,
          length: e.length,
          replacements: e.replacements.slice(0, 3).map((r) => r.value),
        })),
      };

      await this.prisma.writingSubmission.update({ where: { id: submissionId }, data: { analysis, status: 'ANALYZED' } });

      const isCountedAttempt = attemptCount < maxCountedAttempts;
      const xpMultiplier = isCountedAttempt ? 1.0 : 0.2;
      const baseXp = Math.round((XP_BASE.WRITING_BASE + overallScore * XP_BASE.WRITING_SCORE_MULT) * xpMultiplier);
      const xpEarned = computeXP({ base: baseXp, streak, accuracy: overallScore });

      const sub = await this.prisma.writingSubmission.findUnique({ where: { id: submissionId }, select: { userId: true } });
      if (sub === null) return;

      if (isCountedAttempt) {
        await this.progress.recordWritingCompletion({ userId: sub.userId, score: overallScore, timezone });
      } else {
        await this.progress.recordActivity({ userId: sub.userId, xpEarned, minutesSpent: 5, timezone });
      }
    } catch (error: unknown) {
      this.logger.error('WRITING_ANALYSIS_FAILED', {
        submissionId,
        attempt: job.attemptsMade,
        error: error instanceof Error ? error.message : String(error),
      });

      if (job.attemptsMade >= 2) {
        await this.prisma.writingSubmission.update({ where: { id: submissionId }, data: { status: 'ERROR' } });
      }
      throw error;
    }
  }
}

interface FeedbackParams {
  grammarScore: number;
  taskScore: number;
  vocabularyScore: number;
  coherenceScore: number;
  overallScore: number;
  wordCount: number;
  minWords: number;
  errorCount: number;
  connectorCount: number;
  guiraudIndex: number;
  avgWordsPerSent: number;
  borrowedWarning: string | null;
}

function buildFeedback(p: FeedbackParams): string {
  const parts: string[] = [];
  if (p.borrowedWarning !== null) parts.push(p.borrowedWarning);

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