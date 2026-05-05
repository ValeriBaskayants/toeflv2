import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import nlp from 'compromise';

// ─── LanguageTool API types ────────────────────────────────────────────────

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

// ─── Job payload ───────────────────────────────────────────────────────────

interface AnalysisJobData {
    submissionId: string;
    text: string;
    minWords: number;
    userLevel: string;
}

// ─── Constants (outside the method — module-level) ────────────────────────

// Accepted errors per 100 words before grammar score starts dropping significantly.
// Calibrated to CEFR expectations: A1 students make many errors, C2 almost none.
const LEVEL_ERROR_THRESHOLDS: Readonly<Record<string, number>> = {
    A1: 20, A1_PLUS: 16, A2: 13, A2_PLUS: 10,
    B1: 8, B1_PLUS: 6, B2: 4, B2_PLUS: 3,
    C1: 2, C2: 1,
} as const;

const CRITICAL_ISSUE_TYPES = new Set(['misspelling', 'grammar', 'syntax']);
const CRITICAL_CATEGORY_IDS = new Set(['TYPOS']);

// Academic connectors that signal discourse awareness
const CONNECTORS = [
    'however', 'therefore', 'furthermore', 'moreover', 'consequently',
    'nevertheless', 'although', 'whereas', 'in addition', 'similarly',
] as const;

// Pre-compile regexes once at module load — not inside the loop
const CONNECTOR_REGEXES = CONNECTORS.map(
    (c) => new RegExp(`\\b${c}\\b`, 'i'),
);

// ─── Processor ────────────────────────────────────────────────────────────

@Processor('writing-analysis')
export class WritingProcessor {
    private readonly logger = new Logger(WritingProcessor.name);

    constructor(private readonly prisma: PrismaService) { }

    @Process('analyze')
    async handleAnalysis(job: Job<AnalysisJobData>): Promise<void> {
        const { submissionId, text, minWords, userLevel } = job.data;

        try {
            // ── 1. NLP parsing ──────────────────────────────────────────────────
            const doc = nlp(text);
            const wordsArray: string[] = doc.terms().out('array');
            const words = Math.max(1, wordsArray.length);
            const sentences = Math.max(1, doc.sentences().out('array').length);

            // ── 2. LanguageTool request ─────────────────────────────────────────
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

            // Filter stylistic suggestions — count only real errors
            const criticalErrors = matches.filter(
                (m) =>
                    CRITICAL_ISSUE_TYPES.has(m.rule?.issueType) ||
                    CRITICAL_CATEGORY_IDS.has(m.rule?.category?.id),
            );
            const errorCount = criticalErrors.length;

            // ── 3. Grammar Score ────────────────────────────────────────────────
            // Normalized to level: at threshold density → 50 pts, 0 errors → 100 pts
            const errorThreshold = LEVEL_ERROR_THRESHOLDS[userLevel] ?? 10;
            const errorDensity = (errorCount / words) * 100;
            const grammarScore = Math.max(
                0,
                Math.round(100 - (errorDensity / errorThreshold) * 50),
            );

            // ── 4. Task Score ───────────────────────────────────────────────────
            // Penalty for significantly short texts (< 90 % of required)
            const wordRatio = Math.min(1, words / minWords);
            const taskScore = wordRatio < 0.9 ? Math.round(wordRatio * 80) : 100;

            // ── 5. Vocabulary Score — Guiraud Index ─────────────────────────────
            // Guiraud = unique_words / sqrt(total_words)
            // More robust than TTR for texts of varying length.
            // English average: ~4.5 (casual), 6.5+ (academic)
            const uniqueWords = new Set(
                wordsArray.map((w) => w.toLowerCase()),
            ).size;
            const guiraudIndex = uniqueWords / Math.sqrt(words);
            const vocabularyScore = Math.min(100, Math.round((guiraudIndex / 7) * 100));

            // ── 6. Coherence Score ──────────────────────────────────────────────
            const connectorCount = CONNECTOR_REGEXES.filter((re) =>
                re.test(text),
            ).length;

            const avgWordsPerSentence = words / sentences;
            let coherenceScore = 70; // base

            // Reward natural sentence length
            if (avgWordsPerSentence >= 12 && avgWordsPerSentence <= 25) {
                coherenceScore += 15;
            }
            // Reward use of discourse markers
            if (connectorCount >= 3) {
                coherenceScore += 15;
            }
            // Penalise extremes
            if (avgWordsPerSentence < 10) {
                coherenceScore -= (10 - avgWordsPerSentence) * 4;
            } else if (avgWordsPerSentence > 30) {
                coherenceScore -= (avgWordsPerSentence - 30) * 2;
            }
            coherenceScore = Math.max(40, Math.min(100, Math.round(coherenceScore)));

            // ── 7. Overall Score (TOEFL-weighted) ──────────────────────────────
            const overallScore = Math.round(
                grammarScore * 0.35 +
                taskScore * 0.30 +
                vocabularyScore * 0.20 +
                coherenceScore * 0.15,
            );

            // ── 8. Feedback ─────────────────────────────────────────────────────
            const feedbackParts: string[] = [];
            if (grammarScore < 70) feedbackParts.push('Review basic grammar rules and check your spelling carefully.');
            if (wordRatio < 0.9) feedbackParts.push(`Your response is a bit short — aim for at least ${minWords} words.`);
            if (vocabularyScore < 60) feedbackParts.push('Try using synonyms to avoid repetition and enrich your vocabulary.');
            if (coherenceScore < 75) feedbackParts.push('Connect ideas with discourse markers like "moreover" or "consequently".');
            if (feedbackParts.length === 0) {
                feedbackParts.push('Excellent work! Your structure and vocabulary are well-balanced.');
            }

            // ── 9. Persist ──────────────────────────────────────────────────────
            // Note: WritingAnalysis prisma type must include vocabularyScore.
            // See: backend/prisma/schema/writing.prisma → type WritingAnalysis
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
                // Send only top-15 errors to keep the document lean
                errors: matches.slice(0, 15).map((e) => ({
                    message: e.message,
                    context: e.context?.text ?? '',
                    offset: e.offset, // Добавили
                    length: e.length, // Добавили
                    replacements: e.replacements.slice(0, 3).map((r) => r.value),
                })),
            };

            await this.prisma.writingSubmission.update({
                where: { id: submissionId },
                // Prisma expects WritingAnalysis — keep schema in sync (see comment above)
                data: { analysis, status: 'ANALYZED' },
            });

        } catch (error: unknown) {
            this.logger.error('WRITING_ANALYSIS_FAILED', {
                submissionId,
                attempt: job.attemptsMade,
                error: error instanceof Error ? error.message : String(error),
            });

            // Mark as ERROR only on the final retry so the user gets feedback
            if (job.attemptsMade >= 2) {
                await this.prisma.writingSubmission.update({
                    where: { id: submissionId },
                    data: { status: 'ERROR' },
                });
            }

            throw error; // re-throw so Bull schedules the retry
        }
    }
}