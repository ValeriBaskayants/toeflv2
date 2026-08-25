import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Level, ScrambleMode, Prisma, GrammarRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { MistakesService } from '../mistakes/mistakes.service';
import { calcTimeLimit, computeScrambleScore, MODE_DISTRACTOR_COUNT, EXAM_BLOCK_SIZE, EXAM_MODE } from '../../constants/scramble-constants';
import { computeXP } from '../../constants/level-requirements';
import type {
  CreateScrambleExerciseDto,
  GetScrambleDto,
  StartScrambleSessionDto,
  SubmitScrambleDto,
  SubmitScrambleBlockItemDto,
} from './dto/scramble.dto';

const LIST_SELECT = {
  id: true,
  prompt: true,
  sentence: true,
  level: true,
  topic: true,
  allowedModes: true,
  wordCount: true,
  distractorCount: true,
  timeLimitEasy: true,
  timeLimitMedium: true,
  timeLimitHard: true,
  timeLimitExpert: true,
  createdAt: true,
} as const;

interface ScrambleWordEntity {
  id: string;
  word: string;
  role: GrammarRole;
  position: number;
  isDistractor: boolean;
}

interface ScrambleBlockResultEntity {
  exerciseId: string;
  isCorrect: boolean;
  submittedOrder: string[];
  timeSpentSec: number;
  usedHint: boolean;
  answeredAt: string;
}

@Injectable()
export class ScrambleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly mistakes: MistakesService,
  ) {}

  async findAll(query: GetScrambleDto, userId: string) {
    const where: Prisma.ScrambleExerciseWhereInput = {};

    if (query.level !== undefined) where.level = query.level;
    if (query.topic !== undefined) where.topic = { contains: query.topic, mode: 'insensitive' };
    if (query.mode !== undefined) where.allowedModes = { has: query.mode };

    const exercises = await this.prisma.scrambleExercise.findMany({
      where,
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (exercises.length === 0) return exercises;

    const sessions = await this.prisma.scrambleSession.findMany({
      where: { userId, exerciseId: { in: exercises.map((e) => e.id) } },
      select: { exerciseId: true, status: true, finalScore: true },
      orderBy: { startedAt: 'desc' },
    });

    const bestScoreMap = new Map<string, number>();
    const completedIds = new Set<string>();
    const inProgressIds = new Set<string>();

    for (const s of sessions) {
      if (s.status === 'COMPLETED') {
        completedIds.add(s.exerciseId);
        bestScoreMap.set(s.exerciseId, Math.max(bestScoreMap.get(s.exerciseId) ?? 0, s.finalScore ?? 0));
      }
      if (s.status === 'IN_PROGRESS') inProgressIds.add(s.exerciseId);
    }

    return exercises.map((e) => ({
      ...e,
      userStatus: inProgressIds.has(e.id) ? 'in_progress' : completedIds.has(e.id) ? 'completed' : 'not_started',
      bestScore: bestScoreMap.get(e.id) ?? null,
    }));
  }

  async findById(id: string, userId: string, mode?: ScrambleMode) {
    const exercise = await this.prisma.scrambleExercise.findUnique({ where: { id } });
    if (exercise === null) throw new NotFoundException(`Scramble exercise ${id} not found`);

    const openSession = await this.prisma.scrambleSession.findFirst({
      where: { userId, exerciseId: id, status: 'IN_PROGRESS' },
      select: { id: true, mode: true },
    });

    const effectiveMode = openSession?.mode ?? mode;

    return {
      ...exercise,
      sentence: undefined,
      words: this.prepareWordsForMode(exercise.words as unknown as ScrambleWordEntity[], exercise.level, effectiveMode),
      openSession,
      timeLimitSec: calcTimeLimit(effectiveMode ?? 'EASY', exercise.wordCount),
    };
  }

  async startSession(userId: string, dto: StartScrambleSessionDto) {
    const exercise = await this.prisma.scrambleExercise.findUnique({
      where: { id: dto.exerciseId },
      select: { id: true, allowedModes: true, wordCount: true },
    });

    if (exercise === null) throw new NotFoundException('Exercise not found');
    if (!exercise.allowedModes.includes(dto.mode)) {
      throw new BadRequestException(`Mode ${dto.mode} is not available for this exercise`);
    }

    await this.prisma.scrambleSession.updateMany({
      where: { userId, exerciseId: dto.exerciseId, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' },
    });

    const session = await this.prisma.scrambleSession.create({
      data: { userId, exerciseId: dto.exerciseId, mode: dto.mode, attempts: [] },
      select: { id: true, mode: true, status: true, startedAt: true },
    });

    return { ...session, timeLimitSec: calcTimeLimit(dto.mode, exercise.wordCount) };
  }

  async submitAnswer(userId: string, sessionId: string, dto: SubmitScrambleDto) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const exercise = await this.prisma.scrambleExercise.findUnique({
      where: { id: session.exerciseId },
      select: { words: true, sentence: true, wordCount: true, level: true, topic: true },
    });
    if (exercise === null) throw new NotFoundException('Exercise not found');

    const words = exercise.words as unknown as ScrambleWordEntity[];
    const correctWords = words.filter((w) => !w.isDistractor).sort((a, b) => a.position - b.position);
    const correctOrder = correctWords.map((w) => w.id);
    const distractorIds = new Set(words.filter((w) => w.isDistractor).map((w) => w.id));
    const submittedFiltered = dto.wordOrder.filter((id) => !distractorIds.has(id));

    const isCorrect =
      submittedFiltered.length === correctOrder.length &&
      submittedFiltered.every((id, idx) => id === correctOrder[idx]);

    const timeLimitSec = calcTimeLimit(session.mode, exercise.wordCount);
    const timeSpentSec = Math.min(dto.timeSpentSec, timeLimitSec);

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { streak: true } });
    const { finalScore, xpEarned } = computeScrambleScore({
      isCorrect,
      mode: session.mode,
      timeSpentSec,
      timeLimitSec,
      usedHint: dto.usedHint,
      streak: user?.streak ?? 0,
    });

    const attempts = (session.attempts as any[]) ?? [];
    const attemptNumber = attempts.length + 1;

    await this.prisma.scrambleSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        attempts: [
          ...attempts,
          {
            attemptNumber,
            submittedOrder: dto.wordOrder,
            isCorrect,
            timeSpentSec,
            usedHint: dto.usedHint,
            submittedAt: new Date().toISOString(),
          },
        ],
        bestAttempt: attemptNumber,
        isCorrect,
        timeSpentSec,
        usedHint: dto.usedHint,
        finalScore,
        xpEarned,
      },
    });

    await this.mistakes.recordAttempt({
      userId,
      targetId: session.exerciseId,
      source: 'SCRAMBLE',
      category: 'GRAMMAR',
      topic: exercise.topic,
      level: exercise.level,
      isCorrect,
      userAnswer: dto.wordOrder.join(' '),
      correctAnswer: correctOrder.join(' '),
      tags: this.diagnoseScrambleMistake(dto.wordOrder, words),
    });

    await this.progress.recordSkillCompletion({
      userId,
      skill: 'scramble',
      accuracy: isCorrect ? 100 : 0,
      xpEarned,
    });

    return {
      isCorrect,
      correctSentence: exercise.sentence,
      correctOrder,
      finalScore,
      xpEarned,
      timeSpentSec,
      timeLimitSec,
      mode: session.mode,
    };
  }

  async startBlock(userId: string, level: Level) {
    await this.prisma.scrambleBlock.updateMany({
      where: { userId, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' },
    });

    const exerciseIds = await this.sampleExamExerciseIds(level, EXAM_BLOCK_SIZE);

    if (exerciseIds.length < EXAM_BLOCK_SIZE) {
      throw new BadRequestException(
        `Not enough exam-ready exercises for level ${level}. Need ${EXAM_BLOCK_SIZE}, found ${exerciseIds.length}.`,
      );
    }

    const block = await this.prisma.scrambleBlock.create({
      data: { userId, level, exerciseIds, results: [] },
      select: { id: true },
    });

    const firstExercise = await this.prisma.scrambleExercise.findUniqueOrThrow({ where: { id: exerciseIds[0]! } });

    return { blockId: block.id, item: this.buildBlockItemPayload(firstExercise, 0, exerciseIds.length) };
  }

  async getCurrentBlockItem(userId: string, blockId: string) {
    const block = await this.getOwnedInProgressBlock(userId, blockId);
    const results = (block.results as unknown as ScrambleBlockResultEntity[]) ?? [];

    if (results.length >= block.exerciseIds.length) {
      throw new BadRequestException('All items in this block are already answered.');
    }

    const exercise = await this.prisma.scrambleExercise.findUniqueOrThrow({
      where: { id: block.exerciseIds[results.length]! },
    });

    return this.buildBlockItemPayload(exercise, results.length, block.exerciseIds.length);
  }

  async submitBlockItem(userId: string, blockId: string, dto: SubmitScrambleBlockItemDto) {
    const block = await this.getOwnedInProgressBlock(userId, blockId);
    const results = (block.results as unknown as ScrambleBlockResultEntity[]) ?? [];

    if (results.length >= block.exerciseIds.length) {
      throw new BadRequestException('All items in this block are already answered.');
    }

    const exerciseId = block.exerciseIds[results.length]!;
    const exercise = await this.prisma.scrambleExercise.findUniqueOrThrow({ where: { id: exerciseId } });

    const words = exercise.words as unknown as ScrambleWordEntity[];
    const correctWords = words.filter((w) => !w.isDistractor).sort((a, b) => a.position - b.position);
    const correctOrder = correctWords.map((w) => w.id);
    const distractorIds = new Set(words.filter((w) => w.isDistractor).map((w) => w.id));
    const submittedFiltered = dto.wordOrder.filter((id) => !distractorIds.has(id));

    const isCorrect =
      submittedFiltered.length === correctOrder.length &&
      submittedFiltered.every((id, idx) => id === correctOrder[idx]);

    const timeLimitSec = calcTimeLimit(EXAM_MODE, exercise.wordCount);
    const timeSpentSec = Math.min(dto.timeSpentSec, timeLimitSec);

    await this.mistakes.recordAttempt({
      userId,
      targetId: exerciseId,
      source: 'SCRAMBLE',
      category: 'GRAMMAR',
      topic: exercise.topic,
      level: exercise.level,
      isCorrect,
      userAnswer: dto.wordOrder.join(' '),
      correctAnswer: correctOrder.join(' '),
      tags: this.diagnoseScrambleMistake(dto.wordOrder, words),
    });

    const newResult: ScrambleBlockResultEntity = {
      exerciseId,
      isCorrect,
      submittedOrder: dto.wordOrder,
      timeSpentSec,
      usedHint: dto.usedHint,
      answeredAt: new Date().toISOString(),
    };
    const allResults = [...results, newResult];
    const isLastItem = allResults.length === block.exerciseIds.length;

    if (!isLastItem) {
      await this.prisma.scrambleBlock.update({ where: { id: block.id }, data: { results: allResults } });

      const nextExercise = await this.prisma.scrambleExercise.findUniqueOrThrow({
        where: { id: block.exerciseIds[allResults.length]! },
      });

      return {
        isCorrect,
        correctSentence: exercise.sentence,
        itemsCompleted: allResults.length,
        totalItems: block.exerciseIds.length,
        blockCompleted: false,
        nextItem: this.buildBlockItemPayload(nextExercise, allResults.length, block.exerciseIds.length),
      };
    }

    const correctCount = allResults.filter((r) => r.isCorrect).length;
    const finalScorePercent = Math.round((correctCount / allResults.length) * 100);

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { streak: true } });
    const xpEarned = computeXP({ base: 15 * correctCount, streak: user?.streak ?? 0, accuracy: finalScorePercent });

    await this.prisma.scrambleBlock.update({
      where: { id: block.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        results: allResults,
        correctCount,
        finalScorePercent,
        xpEarned,
      },
    });

    await this.progress.recordSkillCompletion({ userId, skill: 'scramble', accuracy: finalScorePercent, xpEarned });

    return {
      isCorrect,
      correctSentence: exercise.sentence,
      itemsCompleted: allResults.length,
      totalItems: block.exerciseIds.length,
      blockCompleted: true,
      nextItem: null,
      correctCount,
      finalScorePercent,
      xpEarned,
    };
  }

  async getBlockReview(userId: string, blockId: string) {
    const block = await this.prisma.scrambleBlock.findUnique({ where: { id: blockId } });
    if (block === null) throw new NotFoundException('Block not found');
    if (block.userId !== userId) throw new ForbiddenException('Access denied');

    const exercises = await this.prisma.scrambleExercise.findMany({
      where: { id: { in: block.exerciseIds } },
      select: { id: true, prompt: true, sentence: true, topic: true },
    });
    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));
    const results = (block.results as unknown as ScrambleBlockResultEntity[]) ?? [];

    return {
      status: block.status,
      correctCount: block.correctCount,
      finalScorePercent: block.finalScorePercent,
      xpEarned: block.xpEarned,
      items: results.map((r) => ({
        prompt: exerciseMap.get(r.exerciseId)?.prompt ?? '',
        correctSentence: exerciseMap.get(r.exerciseId)?.sentence ?? '',
        topic: exerciseMap.get(r.exerciseId)?.topic ?? '',
        isCorrect: r.isCorrect,
        timeSpentSec: r.timeSpentSec,
        usedHint: r.usedHint,
      })),
    };
  }

  async getUserSessions(userId: string, exerciseId?: string) {
    const where: Prisma.ScrambleSessionWhereInput = { userId };
    if (exerciseId !== undefined) where.exerciseId = exerciseId;

    return this.prisma.scrambleSession.findMany({
      where,
      select: {
        id: true,
        mode: true,
        status: true,
        isCorrect: true,
        finalScore: true,
        xpEarned: true,
        timeSpentSec: true,
        usedHint: true,
        startedAt: true,
        completedAt: true,
        exercise: { select: { id: true, level: true, topic: true, wordCount: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  async bulkCreate(items: CreateScrambleExerciseDto[]) {
    if (items.length === 0) return { totalProcessed: 0, inserted: 0, skipped: 0 };

    const sentences = items.map((i) => i.sentence);
    const existing = await this.prisma.scrambleExercise.findMany({
      where: { sentence: { in: sentences } },
      select: { sentence: true },
    });

    const existingSet = new Set(existing.map((e) => e.sentence));
    const toInsert = items.filter((i) => !existingSet.has(i.sentence));

    for (const item of toInsert) {
      const wordCount = item.words.filter((w) => !w.isDistractor).length;
      const distractorCount = item.words.filter((w) => w.isDistractor).length;

      await this.prisma.scrambleExercise.create({
        data: {
          prompt: item.prompt ?? '',
          sentence: item.sentence,
          words: item.words,
          level: item.level,
          topic: item.topic,
          allowedModes: item.allowedModes,
          translation: item.translation,
          explanation: item.explanation,
          wordCount,
          distractorCount,
          timeLimitEasy: calcTimeLimit('EASY', wordCount),
          timeLimitMedium: calcTimeLimit('MEDIUM', wordCount),
          timeLimitHard: calcTimeLimit('HARD', wordCount),
          timeLimitExpert: calcTimeLimit('EXPERT', wordCount),
        },
      });
    }

    return { totalProcessed: items.length, inserted: toInsert.length, skipped: existing.length };
  }

  private async sampleExamExerciseIds(level: Level, count: number): Promise<string[]> {
    const raw = await this.prisma.scrambleExercise.aggregateRaw({
      pipeline: [
        { $match: { level, allowedModes: 'EXPERT', distractorCount: { $lte: 1 } } },
        { $sample: { size: count } },
        { $project: { _id: 1 } },
      ],
    });

    return (raw as unknown as Array<{ _id: { $oid: string } | string }>).map((doc) =>
      typeof doc._id === 'object' ? doc._id.$oid : String(doc._id),
    );
  }

  private buildBlockItemPayload(
    exercise: { id: string; prompt: string; words: unknown; level: Level; wordCount: number; topic: string },
    index: number,
    total: number,
  ) {
    return {
      exerciseId: exercise.id,
      index,
      totalItems: total,
      prompt: exercise.prompt,
      topic: exercise.topic,
      words: this.prepareWordsForMode(exercise.words as ScrambleWordEntity[], exercise.level, EXAM_MODE),
      timeLimitSec: calcTimeLimit(EXAM_MODE, exercise.wordCount),
    };
  }

  private diagnoseScrambleMistake(submitted: string[], allWords: ScrambleWordEntity[]): string[] {
    const wordMap = new Map(allWords.map((w) => [w.id, w]));
    const correctWords = allWords.filter((w) => !w.isDistractor);

    if (submitted.some((id) => wordMap.get(id)?.isDistractor === true)) return ['wrong-word-form'];
    if (correctWords.some((w) => !submitted.includes(w.id))) return ['incomplete-sentence'];
    return ['word-order'];
  }

  private prepareWordsForMode(words: ScrambleWordEntity[], level: Level, mode?: ScrambleMode) {
    const correctWords = words.filter((w) => !w.isDistractor);
    const distractors = words.filter((w) => w.isDistractor);

    const distractorCount = mode ? MODE_DISTRACTOR_COUNT[mode] : 0;
    const activeDistractors = distractors.slice(0, distractorCount);

    const allWords = [...correctWords, ...activeDistractors];
    for (let i = allWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allWords[i], allWords[j]] = [allWords[j]!, allWords[i]!];
    }

    const revealRoleUpfront =
      mode !== 'EXPERT' && (level === 'A1' || level === 'A1_PLUS' || level === 'A2');

    return allWords.map((w) => ({
      id: w.id,
      word: w.word,
      isDistractor: w.isDistractor,
      role: revealRoleUpfront ? w.role : undefined,
    }));
  }

  private async getOwnedInProgressSession(userId: string, sessionId: string) {
    const session = await this.prisma.scrambleSession.findUnique({ where: { id: sessionId } });
    if (session === null) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('Access denied');
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Session is already ${session.status.toLowerCase()}`);
    }
    return session;
  }

  private async getOwnedInProgressBlock(userId: string, blockId: string) {
    const block = await this.prisma.scrambleBlock.findUnique({ where: { id: blockId } });
    if (block === null) throw new NotFoundException('Block not found');
    if (block.userId !== userId) throw new ForbiddenException('Access denied');
    if (block.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Block is already ${block.status.toLowerCase()}`);
    }
    return block;
  }
}
