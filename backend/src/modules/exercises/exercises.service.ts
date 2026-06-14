import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Difficulty, Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import {
  computeXP,
  XP_BASE,
  isSessionCountable,
  DIFFICULTY_XP_MULTIPLIER,
} from '../../constants/level-requirements';
import type { CreateExerciseDto } from './dto/bulk-create-exercise.dto';
import type { GetExercisesDto } from './dto/get-exercises.dto';
import type { SubmitExerciseDto } from './dto/submit-exercise.dto';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type BlankShape = { position: number; answer: string; options: string[] };

function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/[''`]/g, "'").replace(/\s+/g, ' ');
}

function isAnswerCorrect(userAnswer: string, blank: BlankShape): boolean {
  const normalized = normalizeAnswer(userAnswer);
  const correct = normalizeAnswer(blank.answer);

  if (normalized === correct) return true;

  if (blank.options !== undefined && blank.options.length > 0) {
    return blank.options.some((opt) => normalizeAnswer(opt) === normalized);
  }

  return false;
}

@Injectable()
export class ExercisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  async findAll(query: GetExercisesDto & { userId?: string }) {
    const where: Prisma.ExerciseWhereInput = {};
    if (query.level !== undefined) where.level = query.level;
    if (query.difficulty !== undefined) where.difficulty = query.difficulty;
    if (query.topic !== undefined) where.topic = { contains: query.topic, mode: 'insensitive' };

    const take = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const exercises = await this.prisma.exercise.findMany({
      where,
      orderBy: [{ level: 'asc' }, { difficulty: 'asc' }],
      take,
    });

    if (exercises.length === 0 || query.userId === undefined) {
      return exercises;
    }

    const topics = [...new Set(exercises.map((e) => e.topic))];
    const userErrors = await this.prisma.userMistake.findMany({
      where: { userId: query.userId, topic: { in: topics }, source: 'QUIZ' },
      select: { topic: true, status: true, wrongCount: true, correctCount: true },
    });

    const errorMap = new Map(userErrors.map((e) => [e.topic, e]));

    return exercises.map((ex) => {
      const err = errorMap.get(ex.topic);
      const status =
        err === undefined ? 'not_started' : err.status === 'MASTERED' ? 'mastered' : 'in_progress';

      return { ...ex, userStatus: status };
    });
  }

  async getTopics(level?: Level) {
    const exercises = await this.prisma.exercise.findMany({
      where: level !== undefined ? { level } : undefined,
      select: { topic: true },
      distinct: ['topic'],
    });
    return exercises.map((ex) => ex.topic).sort();
  }

  async submitAnswer(userId: string, dto: SubmitExerciseDto, timezone?: string) {
    const [exercise, user] = await Promise.all([
      this.prisma.exercise.findUnique({ where: { id: dto.exerciseId } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { streak: true, currentLevel: true },
      }),
    ]);

    if (exercise === null) throw new NotFoundException(`Exercise ${dto.exerciseId} not found`);
    if (user === null) throw new NotFoundException('User not found');

    const blanks = exercise.blanks as BlankShape[];

    if (dto.answers.length === 0) {
      throw new BadRequestException('At least one answer is required');
    }

    const paddedAnswers = blanks.map((_, idx) => dto.answers[idx] ?? '');

    const results = blanks.map((blank, idx) => {
      const userAnswer = paddedAnswers[idx] ?? '';
      const correct = isAnswerCorrect(userAnswer, blank);

      return {
        position: blank.position,
        userAnswer,
        correctAnswer: blank.answer,
        isCorrect: correct,
        hint:
          !correct && blank.options.length > 0
            ? `Possible answers: ${blank.options.join(', ')}`
            : undefined,
      };
    });

    const correctCount = results.filter((r) => r.isCorrect).length;
    const totalBlanks = blanks.length;
    const accuracy = totalBlanks > 0 ? Math.round((correctCount / totalBlanks) * 100) : 0;

    const difficulty = exercise.difficulty ?? 'EASY';
    const xpBase = correctCount > 0 ? XP_BASE.GRAMMAR_CORRECT : XP_BASE.GRAMMAR_WRONG;

    const xpEarned = computeXP({
      base: xpBase,
      difficulty: difficulty as 'EASY' | 'MEDIUM' | 'HARD',
      streak: user.streak,
      accuracy,
    });

    const countedAsCompleted = isSessionCountable(accuracy);

    if (countedAsCompleted) {
      await this.progress.recordSkillCompletion({
        userId,
        skill: 'grammar',
        accuracy,
        xpEarned,
        difficulty,
        timezone,
      });
    } else {
      await this.progress.recordActivity({
        userId,
        xpEarned: Math.max(1, xpEarned),
        minutesSpent: 1,
        timezone,
      });
    }

    const wrongResults = results.filter((r) => !r.isCorrect);
    if (wrongResults.length > 0) {
      await this.trackGrammarMistake(userId, exercise, wrongResults, user.currentLevel);
    } else if (results.length > 0) {
      await this.prisma.userMistake.updateMany({
        where: { userId, targetId: exercise.id },
        data: { correctCount: { increment: 1 } },
      });
    }

    return {
      results,
      accuracy,
      xpEarned,
      countedAsCompleted,
      explanation: exercise.explanation,
      feedback: buildExerciseFeedback(accuracy, correctCount, totalBlanks),
    };
  }

  private async trackGrammarMistake(
    userId: string,
    exercise: { id: string; topic: string; level: Level },
    wrongResults: Array<{ userAnswer: string; correctAnswer: string }>,
    level: Level,
  ): Promise<void> {
    const firstWrong = wrongResults[0];
    if (firstWrong === undefined) return;

    await this.prisma.userMistake.upsert({
      where: { userId_targetId: { userId, targetId: exercise.id } },
      create: {
        userId,
        targetId: exercise.id,
        source: 'QUIZ',
        topic: exercise.topic,
        category: 'GRAMMAR',
        level: exercise.level,
        wrongCount: 1,
        correctCount: 0,
        status: 'LEARNING',
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000),
        easeFactor: 2.5,
        attempts: {
          create: {
            userAnswer: firstWrong.userAnswer,
            correctAnswer: firstWrong.correctAnswer,
            isCorrect: false,
          },
        },
      },
      update: {
        wrongCount: { increment: 1 },
        attempts: {
          create: {
            userAnswer: firstWrong.userAnswer,
            correctAnswer: firstWrong.correctAnswer,
            isCorrect: false,
          },
        },
      },
    });
  }

  async bulkCreate(exercises: CreateExerciseDto[]): Promise<{
    totalProcessed: number;
    inserted: number;
    skipped: number;
  }> {
    if (exercises.length === 0) return { totalProcessed: 0, inserted: 0, skipped: 0 };

    const sentences = exercises.map((ex) => ex.sentence);
    const existing = await this.prisma.exercise.findMany({
      where: { sentence: { in: sentences } },
      select: { sentence: true },
    });

    const existingSet = new Set(existing.map((e) => e.sentence));
    const toInsert = exercises.filter((ex) => !existingSet.has(ex.sentence));

    if (toInsert.length > 0) {
      await this.prisma.exercise.createMany({ data: toInsert });
    }

    return {
      totalProcessed: exercises.length,
      inserted: toInsert.length,
      skipped: existing.length,
    };
  }
}

function buildExerciseFeedback(
  accuracy: number,
  correctCount: number,
  totalBlanks: number,
): string {
  const wrong = totalBlanks - correctCount;

  if (accuracy === 100) {
    return 'Perfect! All blanks filled correctly.';
  }
  if (accuracy >= 75) {
    return `Good job — ${correctCount}/${totalBlanks} correct. Check the ${wrong} highlighted error${wrong > 1 ? 's' : ''} below.`;
  }
  if (accuracy >= 50) {
    return `${correctCount}/${totalBlanks} correct. Review the grammar rule and the explanation below.`;
  }
  if (accuracy > 0) {
    return `${correctCount}/${totalBlanks} correct. Read the explanation carefully and try again.`;
  }
  return 'No correct answers. Study the grammar rule in the explanation and retry.';
}
