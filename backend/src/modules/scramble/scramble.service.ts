


import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Level, ScrambleMode, Prisma, GrammarRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import {
  calcTimeLimit,
  computeScrambleScore,
  MODE_DISTRACTOR_COUNT,
} from '../../constants/scramble-constants';
import type {
  CreateScrambleExerciseDto,
  GetScrambleDto,
  StartScrambleSessionDto,
  SubmitScrambleDto,
} from './dto/scramble.dto';


const LIST_SELECT = {
  id: true,
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

@Injectable()
export class ScrambleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  

  async findAll(query: GetScrambleDto, userId: string) {
    const where: Prisma.ScrambleExerciseWhereInput = {};

    if (query.level !== undefined) where.level = query.level;
    if (query.topic !== undefined) where.topic = { contains: query.topic, mode: 'insensitive' };
    if (query.mode  !== undefined) where.allowedModes = { has: query.mode };

    const exercises = await this.prisma.scrambleExercise.findMany({
      where,
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (exercises.length === 0) return exercises;

    
    const sessions = await this.prisma.scrambleSession.findMany({
      where: {
        userId,
        exerciseId: { in: exercises.map((e) => e.id) },
      },
      select: { exerciseId: true, status: true, finalScore: true, mode: true },
      orderBy: { startedAt: 'desc' },
    });

    const bestScoreMap = new Map<string, number>();
    const completedIds = new Set<string>();
    const inProgressIds = new Set<string>();

    for (const s of sessions) {
      if (s.status === 'COMPLETED') {
        completedIds.add(s.exerciseId);
        const cur = bestScoreMap.get(s.exerciseId) ?? 0;
        bestScoreMap.set(s.exerciseId, Math.max(cur, s.finalScore ?? 0));
      }
      if (s.status === 'IN_PROGRESS') {
        inProgressIds.add(s.exerciseId);
      }
    }

    return exercises.map((e) => ({
      ...e,
      userStatus: inProgressIds.has(e.id)
        ? 'in_progress'
        : completedIds.has(e.id)
          ? 'completed'
          : 'not_started',
      bestScore: bestScoreMap.get(e.id) ?? null,
    }));
  }

  

  async findById(id: string, userId: string, mode?: ScrambleMode) {
    const exercise = await this.prisma.scrambleExercise.findUnique({
      where: { id },
    });

    if (!exercise) throw new NotFoundException(`Scramble exercise ${id} not found`);

    
    const openSession = await this.prisma.scrambleSession.findFirst({
      where: { userId, exerciseId: id, status: 'IN_PROGRESS' },
      select: { id: true, mode: true },
    });

    
    
    
    const effectiveMode = openSession?.mode ?? mode;
    const shuffledWords = this.prepareWordsForMode(
  exercise.words as unknown as ScrambleWordEntity[],
  exercise.level,
  effectiveMode,
);
    return {
      ...exercise,
      words: shuffledWords,
      
      sentence: undefined, 
      openSession,
      timeLimitSec: effectiveMode
        ? calcTimeLimit(effectiveMode, exercise.wordCount)
        : calcTimeLimit('EASY', exercise.wordCount),
    };
  }

  

  async startSession(userId: string, dto: StartScrambleSessionDto) {
    const exercise = await this.prisma.scrambleExercise.findUnique({
      where: { id: dto.exerciseId },
      select: { id: true, allowedModes: true, wordCount: true },
    });

    if (!exercise) throw new NotFoundException('Exercise not found');

    if (!exercise.allowedModes.includes(dto.mode)) {
      throw new BadRequestException(`Mode ${dto.mode} is not available for this exercise`);
    }

    
    await this.prisma.scrambleSession.updateMany({
      where: { userId, exerciseId: dto.exerciseId, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' },
    });

    const timeLimitSec = calcTimeLimit(dto.mode, exercise.wordCount);

    const session = await this.prisma.scrambleSession.create({
      data: {
        userId,
        exerciseId: dto.exerciseId,
        mode: dto.mode,
        attempts: [],
      },
      select: {
        id: true,
        mode: true,
        status: true,
        startedAt: true,
      },
    });

    return { ...session, timeLimitSec };
  }

  

  async submitAnswer(userId: string, sessionId: string, dto: SubmitScrambleDto) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const exercise = await this.prisma.scrambleExercise.findUnique({
      where: { id: session.exerciseId },
      select: { words: true, sentence: true, wordCount: true, level: true },
    });

    if (!exercise) throw new NotFoundException('Exercise not found');

    const words = exercise.words as unknown as ScrambleWordEntity[];

    
    
    
    const correctWords = words
      .filter((w) => !w.isDistractor)
      .sort((a, b) => a.position - b.position);

    const correctOrder = correctWords.map((w) => w.id);

    
    const distractorIds = new Set(words.filter((w) => w.isDistractor).map((w) => w.id));
    const submittedFiltered = dto.wordOrder.filter((id) => !distractorIds.has(id));

    const isCorrect =
      submittedFiltered.length === correctOrder.length &&
      submittedFiltered.every((id, idx) => id === correctOrder[idx]);

    
    const timeLimitSec = calcTimeLimit(session.mode, exercise.wordCount);
    const timeSpentSec = Math.min(dto.timeSpentSec, timeLimitSec);

    
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { streak: true },
    });

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

    const newAttempt = {
      attemptNumber,
      submittedOrder: dto.wordOrder,
      isCorrect,
      timeSpentSec,
      usedHint: dto.usedHint,
      submittedAt: new Date().toISOString(),
    };

    
    const completed = await this.prisma.scrambleSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        attempts: [...attempts, newAttempt],
        bestAttempt: attemptNumber,
        isCorrect,
        timeSpentSec,
        usedHint: dto.usedHint,
        finalScore,
        xpEarned,
      },
    });

    
    if (isCorrect) {
      await this.progress.recordActivity({
        userId,
        xpEarned,
        minutesSpent: Math.max(1, Math.round(timeSpentSec / 60)),
      });
    }

    
    const wordsWithRoles = correctWords.map((w) => ({
      id: w.id,
      word: w.word,
      role: w.role,
      position: w.position,
    }));

    return {
      isCorrect,
      correctSentence: exercise.sentence,
      correctOrder,
      wordsWithRoles,      
      finalScore,
      xpEarned,
      timeSpentSec,
      timeLimitSec,
      mode: session.mode,
    };
  }

  

  async getUserSessions(userId: string, exerciseId?: string) {
    const where: Prisma.ScrambleSessionWhereInput = { userId };
    if (exerciseId) where.exerciseId = exerciseId;

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
        exercise: {
          select: { id: true, level: true, topic: true, wordCount: true },
        },
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
          sentence:       item.sentence,
          words:          item.words,
          level:          item.level,
          topic:          item.topic,
          allowedModes:   item.allowedModes,
          translation:    item.translation,
          explanation:    item.explanation,
          wordCount,
          distractorCount,
          
          timeLimitEasy:   calcTimeLimit('EASY',   wordCount),
          timeLimitMedium: calcTimeLimit('MEDIUM', wordCount),
          timeLimitHard:   calcTimeLimit('HARD',   wordCount),
          timeLimitExpert: calcTimeLimit('EXPERT', wordCount),
        },
      });
    }

    return {
      totalProcessed: items.length,
      inserted: toInsert.length,
      skipped: existing.length,
    };
  }

  


private prepareWordsForMode(
   words: ScrambleWordEntity[],
  level: Level,
  mode?: ScrambleMode,
) {
  const correctWords = words.filter((w) => !w.isDistractor);
  const distractors = words.filter((w) => w.isDistractor);

  const distractorCount = mode ? MODE_DISTRACTOR_COUNT[mode] : 0;
  const activeDistractors = distractors.slice(0, distractorCount);

  const allWords = [...correctWords, ...activeDistractors];
  for (let i = allWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allWords[i], allWords[j]] = [allWords[j]!, allWords[i]!];
  }

  
  const revealRoleUpfront = level === 'A1' || level === 'A1_PLUS' || level === 'A2';

  return allWords.map((w) => ({
    id: w.id,
    word: w.word,
    isDistractor: w.isDistractor,
    role: revealRoleUpfront ? w.role : undefined,
  }));
}

  private async getOwnedInProgressSession(userId: string, sessionId: string) {
    const session = await this.prisma.scrambleSession.findUnique({
      where: { id: sessionId },
    });

    if (!session)                      throw new NotFoundException('Session not found');
    if (session.userId !== userId)     throw new ForbiddenException('Access denied');
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Session is already ${session.status.toLowerCase()}`);
    }

    return session;
  }
}