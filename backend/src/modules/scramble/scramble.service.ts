import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Level, Prisma, ScrambleBlock, ScrambleExercise, ScrambleMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { BookmarksService } from '../bookmarks/bookmarks.service';
import { EXAM_LEVEL_RANGE, isGuidedLevel } from '../../constants/level-policy';
import { computeXP, getStreakMultiplier } from '../../constants/level-requirements';
import {
  BLOCK_XP_PER_CORRECT, EXAM_BLOCK_SIZE, EXAM_MAX_DISTRACTORS, EXAM_MODE, EXAM_TOTAL_TIME_BUDGET_SEC, MAX_ATTEMPTS_BY_MODE,
  calcTimeLimit, computeScrambleScore, resolvePracticeMode,
} from '../../constants/scramble-constants';
import type {
  CreateScrambleExerciseDto, GetScrambleDto, SaveScrambleDraftDto, StartScrambleSessionDto, SubmitScrambleBlockItemDto, SubmitScrambleDto,
} from './dto/scramble.dto';
import { ScrambleSelectionService } from './scramble-selection.service';
import { ScrambleCompletionService, type ScrambleItemOutcome } from './scramble-completion.service';
import {
  buildFrame, diagnoseMistake, gradeSubmission, orderedDraggableIds, prepareWordsForMode, rekeyWordIds, shuffleIds, validateScrambleExercise,
  type ScrambleAlternativeEntity, type ScrambleWordEntity,
} from './utils/scramble-content.util';

// NOTE: `sentence`, `explanation` and `translation` are NOT listed: they reveal the answer and are served only after the item is finished.
const LIST_SELECT = {
  id: true, prompt: true, level: true, topic: true, allowedModes: true, wordCount: true, distractorCount: true,
  timeLimitEasy: true, timeLimitMedium: true, timeLimitHard: true, timeLimitExpert: true, createdAt: true,
} as const;

export interface ScrambleBlockResultEntity {
  exerciseId: string;
  isCorrect: boolean;
  submittedOrder: string[];
  timeSpentSec: number;
  usedHint: boolean;
  answeredAt: string;
}

export interface ScrambleAttemptEntity {
  attemptNumber: number;
  submittedOrder: string[];
  isCorrect: boolean;
  timeSpentSec: number;
  usedHint: boolean;
  submittedAt: string;
}

export interface ScrambleDraftAnswerEntity {
  exerciseId: string;
  wordOrder: string[];
  filledBlanks: Array<{ position: number; text: string }>;
  usedHint: boolean;
  updatedAt: string;
}

const wordsOf = (e: Pick<ScrambleExercise, 'words'>): ScrambleWordEntity[] => e.words as unknown as ScrambleWordEntity[];
const alternativesOf = (e: Pick<ScrambleExercise, 'alternatives'>): ScrambleAlternativeEntity[] => (e.alternatives ?? []) as unknown as ScrambleAlternativeEntity[];
const elapsedSec = (since: Date): number => Math.max(0, Math.round((Date.now() - since.getTime()) / 1000));
const percent = (correct: number, total: number): number => (total === 0 ? 0 : Math.round((correct / total) * 100));

@Injectable()
export class ScrambleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly completion: ScrambleCompletionService,
    private readonly selection: ScrambleSelectionService,
    private readonly bookmarks: BookmarksService,
  ) {}

  // ── Catalogue ──────────────────────────────────────────────────────────────

  async findAll(query: GetScrambleDto, userId: string) {
    const where: Prisma.ScrambleExerciseWhereInput = {};
    if (query.level !== undefined) where.level = query.level;
    if (query.topic !== undefined) where.topic = { contains: query.topic, mode: 'insensitive' };
    if (query.mode !== undefined) where.allowedModes = { has: query.mode };
    if (query.topicSlug !== undefined) where.topicSlugs = { has: query.topicSlug };

    const exercises = await this.prisma.scrambleExercise.findMany({ where, select: LIST_SELECT, orderBy: { createdAt: 'desc' }, take: 100 });
    if (exercises.length === 0) return [];

    const ids = exercises.map((e) => e.id);
    const [sessions, bookmarked] = await Promise.all([
      this.prisma.scrambleSession.findMany({
        where: { userId, exerciseId: { in: ids }, status: { in: ['COMPLETED', 'IN_PROGRESS'] } },
        select: { exerciseId: true, status: true, finalScore: true },
      }),
      this.bookmarks.getBookmarkedSet(userId, 'SCRAMBLE_EXERCISE', ids),
    ]);

    const best = new Map<string, number>();
    const attempts = new Map<string, number>();
    const inProgress = new Set<string>();
    for (const s of sessions) {
      if (s.status === 'COMPLETED') {
        attempts.set(s.exerciseId, (attempts.get(s.exerciseId) ?? 0) + 1);
        best.set(s.exerciseId, Math.max(best.get(s.exerciseId) ?? 0, s.finalScore ?? 0));
      } else {
        inProgress.add(s.exerciseId);
      }
    }

    return exercises.map((e) => ({
      ...e,
      isBookmarked: bookmarked.has(e.id),
      attempts: attempts.get(e.id) ?? 0,
      userStatus: inProgress.has(e.id) ? 'in_progress' : attempts.has(e.id) ? 'completed' : 'not_started',
      bestScore: best.get(e.id) ?? null,
    }));
  }

  async findById(id: string, userId: string, mode?: ScrambleMode) {
    const exercise = await this.prisma.scrambleExercise.findUnique({ where: { id } });
    if (exercise === null) throw new NotFoundException(`Scramble exercise ${id} not found`);

    const openSession = await this.prisma.scrambleSession.findFirst({ where: { userId, exerciseId: id, status: 'IN_PROGRESS' }, select: { id: true, mode: true } });
    const effectiveMode = openSession?.mode ?? mode;

    return {
      ...this.buildItemPayload(exercise, effectiveMode),
      openSession,
      timeLimitSec: effectiveMode === undefined ? null : calcTimeLimit(effectiveMode, exercise.wordCount),
    };
  }

  // ── Single exercise session ────────────────────────────────────────────────

  async startSession(userId: string, dto: StartScrambleSessionDto) {
    const exercise = await this.prisma.scrambleExercise.findUnique({ where: { id: dto.exerciseId } });
    if (exercise === null) throw new NotFoundException('Exercise not found');
    if (!exercise.allowedModes.includes(dto.mode)) throw new BadRequestException(`Mode ${dto.mode} is not available for this exercise`);

    await this.prisma.scrambleSession.updateMany({ where: { userId, exerciseId: dto.exerciseId, status: 'IN_PROGRESS' }, data: { status: 'ABANDONED' } });
    const session = await this.prisma.scrambleSession.create({
      data: { userId, exerciseId: dto.exerciseId, mode: dto.mode, attempts: [] },
      select: { id: true, mode: true, status: true, startedAt: true },
    });

    return { ...session, timeLimitSec: calcTimeLimit(dto.mode, exercise.wordCount), item: this.buildItemPayload(exercise, dto.mode) };
  }

  async submitAnswer(userId: string, sessionId: string, dto: SubmitScrambleDto, timezone?: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);
    const exercise = await this.prisma.scrambleExercise.findUnique({ where: { id: session.exerciseId } });
    if (exercise === null) throw new NotFoundException('Exercise not found');

    const words = wordsOf(exercise);
    const isCorrect = gradeSubmission(words, alternativesOf(exercise), dto.wordOrder, dto.filledBlanks);
    const correctOrder = orderedDraggableIds(words);
    const usedHint = dto.usedHint ?? false;

    // The server owns the clock: a client-reported time cannot be trusted for the speed bonus.
    const timeLimitSec = calcTimeLimit(session.mode, exercise.wordCount);
    const timeSpentSec = Math.min(elapsedSec(session.startedAt), timeLimitSec);

    const attempts = (session.attempts as unknown as ScrambleAttemptEntity[]) ?? [];
    const attemptNumber = attempts.length + 1;
    const maxAttempts = MAX_ATTEMPTS_BY_MODE[session.mode];
    const isFinalAttempt = isCorrect || attemptNumber >= maxAttempts;
    const newAttempt: ScrambleAttemptEntity = { attemptNumber, submittedOrder: dto.wordOrder, isCorrect, timeSpentSec, usedHint, submittedAt: new Date().toISOString() };

    const priorSeen = await this.priorCompletedExerciseIds(userId, [exercise.id]);
    const outcome: ScrambleItemOutcome = {
      exerciseId: exercise.id, level: exercise.level, topic: exercise.topic, topicSlugs: exercise.topicSlugs, isCorrect,
      userAnswer: dto.wordOrder.join(' '), correctAnswer: correctOrder.join(' '), tags: diagnoseMistake(dto.wordOrder, words),
      isFirstCompletion: !priorSeen.has(exercise.id),
    };

    if (!isFinalAttempt) {
      const claim = await this.prisma.scrambleSession.updateMany({ where: { id: sessionId, status: 'IN_PROGRESS' }, data: { attempts: [...attempts, newAttempt] } });
      if (claim.count === 0) throw new BadRequestException('Session was already completed');
      await this.completion.recordItems(userId, [{ ...outcome, isFirstCompletion: false }]);
      return { isCorrect: false, attemptsRemaining: maxAttempts - attemptNumber, finalScore: null, xpEarned: null };
    }

    const streak = await this.progress.getEffectiveStreak(userId, timezone);
    const score = computeScrambleScore({ isCorrect, mode: session.mode, timeSpentSec, timeLimitSec, usedHint, streakMultiplier: getStreakMultiplier(streak) });

    const claim = await this.prisma.scrambleSession.updateMany({
      where: { id: sessionId, status: 'IN_PROGRESS' },
      data: { status: 'COMPLETED', completedAt: new Date(), attempts: [...attempts, newAttempt], bestAttempt: attemptNumber, isCorrect, timeSpentSec, usedHint, finalScore: score.finalScore },
    });
    if (claim.count === 0) throw new BadRequestException('Session was already completed');

    const result = await this.completion.complete({
      userId, items: [outcome], accuracyPercent: isCorrect ? 100 : 0, baseXp: score.xpEarned, timeSpentSec, timezone, recordItems: true,
    });
    await this.prisma.scrambleSession.update({ where: { id: sessionId }, data: { xpEarned: result.xpEarned } });

    return {
      isCorrect, attemptsRemaining: 0, correctSentence: exercise.sentence, correctOrder, explanation: exercise.explanation, translation: exercise.translation,
      finalScore: score.finalScore, xpEarned: result.xpEarned, countedTowardLevel: result.countedUnits > 0, timeSpentSec, timeLimitSec, mode: session.mode,
    };
  }

  // ── Blocks: "TOEFL experience" (10 items, one timer) and practice sets ─────
  //  guided (A1-A2+): one item at a time with instant feedback.
  //  free navigation (B1+ practice and EXAM): all items at once, one timer, answers editable until finish/expire.
  //  UNVERIFIED against ETS: whether the real test lets you go back between Build a Sentence items.

  private usesFreeNavigation(block: Pick<ScrambleBlock, 'kind' | 'level'>): boolean {
    return block.kind === 'EXAM' || (block.level !== null && !isGuidedLevel(block.level));
  }

  private blockMode(block: Pick<ScrambleBlock, 'kind' | 'level'>): ScrambleMode {
    return block.kind === 'EXAM' ? EXAM_MODE : resolvePracticeMode(block.level ?? 'A1');
  }

  async startPracticeSet(userId: string, level: Level, count: number) {
    await this.prisma.scrambleBlock.updateMany({ where: { userId, status: 'IN_PROGRESS', kind: 'PRACTICE_SET' }, data: { status: 'ABANDONED' } });

    const pickedIds = await this.selection.pickPracticeSet(userId, level, count);
    const exercises = await this.prisma.scrambleExercise.findMany({ where: { id: { in: pickedIds } } });
    const byId = new Map(exercises.map((e) => [e.id, e]));
    const ordered = pickedIds.map((id) => byId.get(id)).filter((e): e is ScrambleExercise => e !== undefined);
    if (ordered.length === 0) throw new BadRequestException(`No exercises available for level ${level}`);

    const mode = resolvePracticeMode(level);
    const block = await this.prisma.scrambleBlock.create({
      data: {
        userId, level, kind: 'PRACTICE_SET', exerciseIds: ordered.map((e) => e.id), draftAnswers: [], results: [],
        totalTimeBudgetSec: ordered.reduce((sum, e) => sum + calcTimeLimit(mode, e.wordCount), 0),
      },
      select: { id: true, startedAt: true, totalTimeBudgetSec: true },
    });

    const freeNavigation = !isGuidedLevel(level);
    if (!freeNavigation) {
      return { blockId: block.id, kind: 'PRACTICE_SET' as const, freeNavigation, startedAt: block.startedAt, totalItems: ordered.length, item: this.buildBlockItem(ordered[0] as ScrambleExercise, 0, ordered.length, mode, false) };
    }
    return {
      blockId: block.id, kind: 'PRACTICE_SET' as const, freeNavigation, startedAt: block.startedAt, totalTimeBudgetSec: block.totalTimeBudgetSec,
      items: ordered.map((e, i) => this.buildBlockItem(e, i, ordered.length, mode, true)),
    };
  }

  async startBlock(userId: string) {
    await this.prisma.scrambleBlock.updateMany({ where: { userId, status: 'IN_PROGRESS' }, data: { status: 'ABANDONED' } });

    const exerciseIds = await this.sampleExamExerciseIds(EXAM_BLOCK_SIZE);
    if (exerciseIds.length < EXAM_BLOCK_SIZE) {
      throw new BadRequestException(`Not enough exam-ready exercises. Need ${EXAM_BLOCK_SIZE}, found ${exerciseIds.length}.`);
    }

    const exercises = await this.prisma.scrambleExercise.findMany({ where: { id: { in: exerciseIds } } });
    const byId = new Map(exercises.map((e) => [e.id, e]));
    const ordered = exerciseIds.map((id) => byId.get(id)).filter((e): e is ScrambleExercise => e !== undefined);
    if (ordered.length < EXAM_BLOCK_SIZE) throw new BadRequestException('Exam exercises changed while the block was being created. Try again.');

    const block = await this.prisma.scrambleBlock.create({
      data: { userId, level: null, kind: 'EXAM', exerciseIds, draftAnswers: [], results: [], totalTimeBudgetSec: EXAM_TOTAL_TIME_BUDGET_SEC },
      select: { id: true, startedAt: true, totalTimeBudgetSec: true },
    });

    return {
      blockId: block.id, kind: 'EXAM' as const, startedAt: block.startedAt, totalTimeBudgetSec: block.totalTimeBudgetSec,
      items: ordered.map((e, i) => this.buildBlockItem(e, i, ordered.length, EXAM_MODE, true)),
    };
  }

  // --- guided linear flow ---

  async getCurrentBlockItem(userId: string, blockId: string) {
    const block = await this.getOwnedInProgressBlock(userId, blockId);
    if (this.usesFreeNavigation(block)) throw new BadRequestException('This block uses free navigation — use GET /scramble/blocks/:id/items instead.');

    const results = (block.results as unknown as ScrambleBlockResultEntity[]) ?? [];
    const exerciseId = block.exerciseIds[results.length];
    if (exerciseId === undefined) throw new BadRequestException('All items in this block are already answered.');

    const exercise = await this.prisma.scrambleExercise.findUnique({ where: { id: exerciseId } });
    if (exercise === null) throw new NotFoundException(`Exercise ${exerciseId} referenced by the block is missing`);
    return this.buildBlockItem(exercise, results.length, block.exerciseIds.length, this.blockMode(block), false);
  }

  async submitBlockItem(userId: string, blockId: string, dto: SubmitScrambleBlockItemDto, timezone?: string) {
    const block = await this.getOwnedInProgressBlock(userId, blockId);
    if (this.usesFreeNavigation(block)) throw new BadRequestException('This block uses free navigation — use POST /scramble/blocks/:id/draft and /finish instead.');

    const results = (block.results as unknown as ScrambleBlockResultEntity[]) ?? [];
    const exerciseId = block.exerciseIds[results.length];
    if (exerciseId === undefined) throw new BadRequestException('All items in this block are already answered.');

    const mode = this.blockMode(block);
    const exercise = await this.prisma.scrambleExercise.findUnique({ where: { id: exerciseId } });
    if (exercise === null) throw new NotFoundException(`Exercise ${exerciseId} referenced by the block is missing`);

    const words = wordsOf(exercise);
    const isCorrect = gradeSubmission(words, alternativesOf(exercise), dto.wordOrder, dto.filledBlanks);
    const timeSpentSec = Math.min(dto.timeSpentSec ?? 0, calcTimeLimit(mode, exercise.wordCount));
    const allResults: ScrambleBlockResultEntity[] = [
      ...results,
      { exerciseId, isCorrect, submittedOrder: dto.wordOrder, timeSpentSec, usedHint: dto.usedHint ?? false, answeredAt: new Date().toISOString() },
    ];

    const claim = await this.prisma.scrambleBlock.updateMany({
      where: { id: block.id, status: 'IN_PROGRESS', resultsVersion: block.resultsVersion },
      data: { results: allResults, resultsVersion: { increment: 1 } },
    });
    if (claim.count === 0) throw new BadRequestException('This item was already answered by a concurrent request.');

    const seen = await this.priorCompletedExerciseIds(userId, [exerciseId], block.id);
    await this.completion.recordItems(userId, [{
      exerciseId, level: exercise.level, topic: exercise.topic, topicSlugs: exercise.topicSlugs, isCorrect,
      userAnswer: dto.wordOrder.join(' '), correctAnswer: orderedDraggableIds(words).join(' '), tags: diagnoseMistake(dto.wordOrder, words),
      isFirstCompletion: !seen.has(exerciseId),
    }]);

    if (allResults.length < block.exerciseIds.length) {
      const nextId = block.exerciseIds[allResults.length] as string;
      const next = await this.prisma.scrambleExercise.findUnique({ where: { id: nextId } });
      if (next === null) throw new NotFoundException(`Exercise ${nextId} referenced by the block is missing`);
      return {
        isCorrect, correctSentence: exercise.sentence, itemsCompleted: allResults.length, totalItems: block.exerciseIds.length,
        blockCompleted: false, nextItem: this.buildBlockItem(next, allResults.length, block.exerciseIds.length, mode, false),
      };
    }

    const done = await this.completeBlock(userId, block, allResults, false, false, timezone);
    return { isCorrect, correctSentence: exercise.sentence, itemsCompleted: allResults.length, nextItem: null, ...done };
  }

  // --- free-navigation flow ---

  async getBlockItems(userId: string, blockId: string) {
    const block = await this.getOwnedInProgressBlock(userId, blockId);
    if (!this.usesFreeNavigation(block)) throw new BadRequestException('This block uses the guided step-by-step flow — use GET /scramble/blocks/:id/current instead.');

    const exercises = await this.prisma.scrambleExercise.findMany({ where: { id: { in: block.exerciseIds } } });
    const byId = new Map(exercises.map((e) => [e.id, e]));
    const mode = this.blockMode(block);

    return {
      blockId: block.id, kind: block.kind, startedAt: block.startedAt, totalTimeBudgetSec: block.totalTimeBudgetSec,
      items: block.exerciseIds.map((id, index) => {
        const exercise = byId.get(id);
        if (exercise === undefined) throw new NotFoundException(`Exercise ${id} referenced by the block is missing`);
        return this.buildBlockItem(exercise, index, block.exerciseIds.length, mode, true);
      }),
      draftAnswers: (block.draftAnswers as unknown as ScrambleDraftAnswerEntity[]) ?? [],
    };
  }

  async saveDraftAnswer(userId: string, blockId: string, dto: SaveScrambleDraftDto) {
    const block = await this.getOwnedInProgressBlock(userId, blockId);
    if (!this.usesFreeNavigation(block)) throw new BadRequestException('This block uses the guided step-by-step flow — use POST /scramble/blocks/:id/submit instead.');
    if (!block.exerciseIds.includes(dto.exerciseId)) throw new BadRequestException('This exercise does not belong to the block.');

    const drafts = (block.draftAnswers as unknown as ScrambleDraftAnswerEntity[]) ?? [];
    const updated: ScrambleDraftAnswerEntity = {
      exerciseId: dto.exerciseId, wordOrder: dto.wordOrder, filledBlanks: dto.filledBlanks ?? [], usedHint: dto.usedHint ?? false, updatedAt: new Date().toISOString(),
    };

    const claim = await this.prisma.scrambleBlock.updateMany({
      where: { id: block.id, status: 'IN_PROGRESS', draftsVersion: block.draftsVersion },
      data: { draftAnswers: [...drafts.filter((d) => d.exerciseId !== dto.exerciseId), updated], draftsVersion: { increment: 1 } },
    });
    if (claim.count === 0) throw new BadRequestException('Draft was updated concurrently — please retry.');
    return { saved: true, exerciseId: dto.exerciseId };
  }

  async finishBlock(userId: string, blockId: string, timezone?: string) {
    const block = await this.getOwnedInProgressBlock(userId, blockId);
    if (!this.usesFreeNavigation(block)) throw new BadRequestException('This block finishes automatically after the last item.');
    return this.finalizeFreeNavigation(userId, block, false, timezone);
  }

  /** The client calls this when the single block timer reaches 0:00. Free navigation: grades the drafts; guided: pads the rest as unanswered. */
  async expireBlock(userId: string, blockId: string, timezone?: string) {
    const block = await this.getOwnedInProgressBlock(userId, blockId);
    if (this.usesFreeNavigation(block)) return this.finalizeFreeNavigation(userId, block, true, timezone);

    const results = (block.results as unknown as ScrambleBlockResultEntity[]) ?? [];
    const unanswered = block.exerciseIds.slice(results.length);
    if (unanswered.length === 0) return { ...(await this.getBlockReview(userId, blockId)), blockCompleted: true };

    const now = new Date().toISOString();
    const filler: ScrambleBlockResultEntity[] = unanswered.map((exerciseId) => ({ exerciseId, isCorrect: false, submittedOrder: [], timeSpentSec: 0, usedHint: false, answeredAt: now }));
    const done = await this.completeBlock(userId, block, [...results, ...filler], true, false, timezone);

    const exercises = await this.prisma.scrambleExercise.findMany({ where: { id: { in: unanswered } } });
    await this.completion.recordItems(userId, exercises.map((e) => ({
      exerciseId: e.id, level: e.level, topic: e.topic, topicSlugs: e.topicSlugs, isCorrect: false, userAnswer: '',
      correctAnswer: orderedDraggableIds(wordsOf(e)).join(' '), tags: ['not-answered'], isFirstCompletion: false,
    })));
    return done;
  }

  private async finalizeFreeNavigation(userId: string, block: ScrambleBlock, timedOut: boolean, timezone?: string) {
    const drafts = new Map(((block.draftAnswers as unknown as ScrambleDraftAnswerEntity[]) ?? []).map((d) => [d.exerciseId, d]));
    const exercises = await this.prisma.scrambleExercise.findMany({ where: { id: { in: block.exerciseIds } } });
    const byId = new Map(exercises.map((e) => [e.id, e]));
    const now = new Date().toISOString();

    const results: ScrambleBlockResultEntity[] = block.exerciseIds.map((exerciseId) => {
      const exercise = byId.get(exerciseId);
      const draft = drafts.get(exerciseId);
      const wordOrder = draft?.wordOrder ?? [];
      const isCorrect = exercise !== undefined && wordOrder.length > 0 ? gradeSubmission(wordsOf(exercise), alternativesOf(exercise), wordOrder, draft?.filledBlanks) : false;
      // One shared timer: a per-item time is meaningless here.
      return { exerciseId, isCorrect, submittedOrder: wordOrder, timeSpentSec: 0, usedHint: draft?.usedHint ?? false, answeredAt: now };
    });
    return this.completeBlock(userId, block, results, timedOut, true, timezone);
  }

  /** Single completion path for every block flow. The status claim comes FIRST so a finish/expire race cannot grant XP twice. */
  private async completeBlock(userId: string, block: ScrambleBlock, results: ScrambleBlockResultEntity[], timedOut: boolean, recordItems: boolean, timezone?: string) {
    const correctCount = results.filter((r) => r.isCorrect).length;
    const finalScorePercent = percent(correctCount, results.length);

    const [exercises, seen] = await Promise.all([
      this.prisma.scrambleExercise.findMany({ where: { id: { in: block.exerciseIds } } }),
      this.priorCompletedExerciseIds(userId, block.exerciseIds, block.id),
    ]);

    const claim = await this.prisma.scrambleBlock.updateMany({
      where: { id: block.id, status: 'IN_PROGRESS' },
      data: { status: 'COMPLETED', completedAt: new Date(), results, correctCount, finalScorePercent },
    });
    if (claim.count === 0) throw new BadRequestException('Block was already completed');

    const byId = new Map(exercises.map((e) => [e.id, e]));
    const items: ScrambleItemOutcome[] = [];
    for (const r of results) {
      const e = byId.get(r.exerciseId);
      if (e === undefined) continue;
      const words = wordsOf(e);
      items.push({
        exerciseId: e.id, level: e.level, topic: e.topic, topicSlugs: e.topicSlugs, isCorrect: r.isCorrect,
        userAnswer: r.submittedOrder.join(' '), correctAnswer: orderedDraggableIds(words).join(' '),
        tags: r.isCorrect ? [] : diagnoseMistake(r.submittedOrder, words), isFirstCompletion: !seen.has(e.id),
      });
    }

    const streak = await this.progress.getEffectiveStreak(userId, timezone);
    const baseXp = computeXP({ base: BLOCK_XP_PER_CORRECT * correctCount, streak, accuracy: finalScorePercent });
    const outcome = await this.completion.complete({
      userId, items, accuracyPercent: finalScorePercent, baseXp, timeSpentSec: elapsedSec(block.startedAt), timezone, recordItems,
    });
    await this.prisma.scrambleBlock.update({ where: { id: block.id }, data: { xpEarned: outcome.xpEarned } });

    return { blockCompleted: true, timedOut, correctCount, finalScorePercent, xpEarned: outcome.xpEarned, countedUnits: outcome.countedUnits, totalItems: results.length };
  }

  async getBlockReview(userId: string, blockId: string) {
    const block = await this.prisma.scrambleBlock.findUnique({ where: { id: blockId } });
    if (block === null) throw new NotFoundException('Block not found');
    if (block.userId !== userId) throw new ForbiddenException('Access denied');
    // The review shows the correct sentences: never before the block is over.
    if (block.status === 'IN_PROGRESS') throw new BadRequestException('The review is available after the block is finished.');

    const exercises = await this.prisma.scrambleExercise.findMany({ where: { id: { in: block.exerciseIds } }, select: { id: true, prompt: true, sentence: true, topic: true } });
    const byId = new Map(exercises.map((e) => [e.id, e]));
    const results = (block.results as unknown as ScrambleBlockResultEntity[]) ?? [];

    return {
      status: block.status, correctCount: block.correctCount, finalScorePercent: block.finalScorePercent, xpEarned: block.xpEarned,
      items: results.map((r) => ({
        exerciseId: r.exerciseId, prompt: byId.get(r.exerciseId)?.prompt ?? '', correctSentence: byId.get(r.exerciseId)?.sentence ?? '',
        topic: byId.get(r.exerciseId)?.topic ?? '', isCorrect: r.isCorrect, timeSpentSec: r.timeSpentSec, usedHint: r.usedHint,
      })),
    };
  }

  async getUserSessions(userId: string, exerciseId?: string) {
    const where: Prisma.ScrambleSessionWhereInput = { userId };
    if (exerciseId !== undefined) where.exerciseId = exerciseId;
    return this.prisma.scrambleSession.findMany({
      where,
      select: {
        id: true, mode: true, status: true, isCorrect: true, finalScore: true, xpEarned: true, timeSpentSec: true, usedHint: true, startedAt: true, completedAt: true,
        exercise: { select: { id: true, level: true, topic: true, wordCount: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  // ── Admin import ───────────────────────────────────────────────────────────

  async bulkCreate(items: CreateScrambleExerciseDto[]) {
    items.forEach((item, i) => {
      const problems = validateScrambleExercise(item);
      if (problems.length > 0) throw new BadRequestException(`items[${i}]: ${problems.join('; ')}`);
    });

    const existing = await this.prisma.scrambleExercise.findMany({ where: { sentence: { in: items.map((i) => i.sentence) } }, select: { sentence: true } });
    const seen = new Set(existing.map((e) => e.sentence));
    const fresh = items.filter((i) => {
      if (seen.has(i.sentence)) return false;
      seen.add(i.sentence);
      return true;
    });

    const data = fresh.map((item) => {
      const keyed = rekeyWordIds(item.words, item.alternatives);
      const frameWords = keyed.words.filter((w) => w.isDistractor !== true);
      const wordCount = frameWords.length;
      return {
        prompt: item.prompt ?? '', sentence: item.sentence, words: keyed.words, alternatives: keyed.alternatives, level: item.level, topic: item.topic,
        topicSlugs: item.topicSlugs ?? [], allowedModes: item.allowedModes, translation: item.translation, explanation: item.explanation,
        wordCount, distractorCount: keyed.words.length - wordCount,
        timeLimitEasy: calcTimeLimit('EASY', wordCount), timeLimitMedium: calcTimeLimit('MEDIUM', wordCount),
        timeLimitHard: calcTimeLimit('HARD', wordCount), timeLimitExpert: calcTimeLimit('EXPERT', wordCount),
      };
    });
    if (data.length > 0) await this.prisma.scrambleExercise.createMany({ data });

    return { totalProcessed: items.length, inserted: data.length, skipped: items.length - data.length };
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  /** What the client may see for one item: the frame, the chunk bank, the context sentence. Never the answer, the distractor flag, the translation. */
  private buildItemPayload(exercise: ScrambleExercise, mode?: ScrambleMode) {
    const words = wordsOf(exercise);
    const { tiles, blanks } = prepareWordsForMode(words, exercise.level, mode);
    return { exerciseId: exercise.id, prompt: exercise.prompt, level: exercise.level, topic: exercise.topic, allowedModes: exercise.allowedModes, frame: buildFrame(words), tiles, blanks };
  }

  private buildBlockItem(exercise: ScrambleExercise, index: number, total: number, mode: ScrambleMode, freeNavigation: boolean) {
    return {
      ...this.buildItemPayload(exercise, mode), index, totalItems: total,
      // One shared timer in free navigation; the per-item timer belongs to the guided flow only.
      timeLimitSec: freeNavigation ? null : calcTimeLimit(mode, exercise.wordCount),
    };
  }

  /** Exercises the user has already completed, as a single session or inside another finished block (farming guard). */
  private async priorCompletedExerciseIds(userId: string, exerciseIds: string[], excludeBlockId?: string): Promise<Set<string>> {
    const [sessions, blocks] = await Promise.all([
      this.prisma.scrambleSession.findMany({ where: { userId, status: 'COMPLETED', exerciseId: { in: exerciseIds } }, select: { exerciseId: true } }),
      this.prisma.scrambleBlock.findMany({
        where: { userId, status: 'COMPLETED', exerciseIds: { hasSome: exerciseIds }, ...(excludeBlockId === undefined ? {} : { id: { not: excludeBlockId } }) },
        select: { exerciseIds: true },
      }),
    ]);
    const wanted = new Set(exerciseIds);
    const seen = new Set(sessions.map((s) => s.exerciseId));
    for (const b of blocks) for (const id of b.exerciseIds) if (wanted.has(id)) seen.add(id);
    return seen;
  }

  private async getOwnedInProgressSession(userId: string, sessionId: string) {
    const session = await this.prisma.scrambleSession.findUnique({ where: { id: sessionId } });
    if (session === null) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('Access denied');
    if (session.status !== 'IN_PROGRESS') throw new BadRequestException(`Session is already ${session.status.toLowerCase()}`);
    return session;
  }

  private async getOwnedInProgressBlock(userId: string, blockId: string) {
    const block = await this.prisma.scrambleBlock.findUnique({ where: { id: blockId } });
    if (block === null) throw new NotFoundException('Block not found');
    if (block.userId !== userId) throw new ForbiddenException('Access denied');
    if (block.status !== 'IN_PROGRESS') throw new BadRequestException(`Block is already ${block.status.toLowerCase()}`);
    return block;
  }

  /** Portable replacement for the Mongo-only aggregateRaw/$sample: ids only, shuffled in memory. */
  private async sampleExamExerciseIds(count: number): Promise<string[]> {
    const rows = await this.prisma.scrambleExercise.findMany({
      where: { level: { in: [...EXAM_LEVEL_RANGE] }, allowedModes: { has: EXAM_MODE }, distractorCount: { lte: EXAM_MAX_DISTRACTORS } },
      select: { id: true },
      take: 2000,
    });
    return shuffleIds(rows.map((r) => r.id)).slice(0, count);
  }
}