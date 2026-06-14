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
import type { CreateMultipleChoiceDto } from './dto/bulk-create-multiple-choice.dto';
import type { GetMultipleChoiceDto } from './dto/get-multiple-choice.dto';
import type { SubmitMCSessionDto } from './dto/submit-session.dto';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const MIN_QUESTIONS_FOR_PROGRESS = 5;

@Injectable()
export class MultipleChoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  async findAll(query: GetMultipleChoiceDto) {
    const where: Prisma.MultipleChoiceWhereInput = {};
    if (query.level !== undefined) where.level = query.level;
    if (query.difficulty !== undefined) where.difficulty = query.difficulty;
    if (query.topic !== undefined) where.topic = { contains: query.topic, mode: 'insensitive' };

    const take = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    return this.prisma.multipleChoice.findMany({
      where,
      orderBy: [{ level: 'asc' }, { difficulty: 'asc' }],
      take,
    });
  }

  async findRandom(level: Level, count: number) {
    const raw = await this.prisma.multipleChoice.aggregateRaw({
      pipeline: [{ $match: { level } }, { $sample: { size: count } }],
    });

    return (raw as unknown as Array<Record<string, unknown>>).map((item) => {
      const { _id, ...rest } = item;
      const oid = _id as { $oid?: string } | string | null;
      return {
        ...rest,
        id: typeof oid === 'object' && oid !== null && '$oid' in oid ? oid.$oid : String(oid),
      };
    });
  }

  async submitSession(
    userId: string,
    dto: SubmitMCSessionDto,
    timezone?: string,
  ): Promise<{
    results: Array<{
      questionId: string;
      isCorrect: boolean;
      correctIndex: number;
      explanation: string;
    }>;
    correctCount: number;
    totalCount: number;
    accuracy: number;
    xpEarned: number;
    countedAsCompleted: boolean;
    feedback: string;
  }> {
    if (dto.answers.length === 0) {
      throw new BadRequestException('At least one answer is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentLevel: true, streak: true },
    });
    if (user === null) throw new NotFoundException('User not found');

    const level = user.currentLevel;

    const questionIds = dto.answers.map((a) => a.questionId);
    const questions = await this.prisma.multipleChoice.findMany({
      where: { id: { in: questionIds } },
    });

    if (questions.length === 0) {
      throw new NotFoundException('No questions found for the provided IDs');
    }

    const qMap = new Map(questions.map((q) => [q.id, q]));

    let correctCount = 0;
    let totalXpBase = 0;
    const mistakeOps: Promise<unknown>[] = [];

    const results = dto.answers
      .map((a) => {
        const question = qMap.get(a.questionId);
        if (question === undefined) return null;

        const isCorrect = a.selectedIndex === question.correctIndex;
        const difficulty = question.difficulty ?? 'EASY';
        const diffMult =
          DIFFICULTY_XP_MULTIPLIER[difficulty as keyof typeof DIFFICULTY_XP_MULTIPLIER] ?? 1.0;

        if (isCorrect) {
          correctCount++;
          totalXpBase += XP_BASE.QUIZ_CORRECT * diffMult;

          mistakeOps.push(
            this.prisma.userMistake.updateMany({
              where: { userId, targetId: a.questionId },
              data: { correctCount: { increment: 1 } },
            }),
          );
        } else {
          mistakeOps.push(
            this.prisma.userMistake.upsert({
              where: { userId_targetId: { userId, targetId: a.questionId } },
              create: {
                userId,
                targetId: a.questionId,
                source: 'QUIZ',
                topic: question.topic ?? 'General',
                category: 'GRAMMAR',
                level,
                wrongCount: 1,
                correctCount: 0,
                status: 'LEARNING',
                nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000),
                easeFactor: 2.5,
                attempts: {
                  create: {
                    userAnswer: String(a.selectedIndex),
                    correctAnswer: String(question.correctIndex),
                    isCorrect: false,
                  },
                },
              },
              update: {
                wrongCount: { increment: 1 },
                attempts: {
                  create: {
                    userAnswer: String(a.selectedIndex),
                    correctAnswer: String(question.correctIndex),
                    isCorrect: false,
                  },
                },
              },
            }),
          );
        }

        return {
          questionId: a.questionId,
          isCorrect,
          correctIndex: question.correctIndex,
          explanation: question.explanation,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    await Promise.all(mistakeOps);

    const totalCount = results.length;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    const countedAsCompleted =
      totalCount >= MIN_QUESTIONS_FOR_PROGRESS && isSessionCountable(accuracy);

    const xpEarned = computeXP({
      base: Math.round(totalXpBase),
      streak: user.streak,
      accuracy,
    });

    if (countedAsCompleted) {
      await this.progress.recordSkillCompletion({
        userId,
        skill: 'quiz',
        accuracy,
        xpEarned,
        timezone,
      });
    } else {
      await this.progress.recordActivity({
        userId,
        xpEarned: Math.max(1, Math.round(xpEarned * 0.3)),
        minutesSpent: Math.ceil(totalCount * 0.5),
        timezone,
      });
    }

    const feedback = buildQuizFeedback(accuracy, correctCount, totalCount, countedAsCompleted);

    return {
      results,
      correctCount,
      totalCount,
      accuracy,
      xpEarned,
      countedAsCompleted,
      feedback,
    };
  }

  async bulkCreate(items: CreateMultipleChoiceDto[]): Promise<{
    totalProcessed: number;
    inserted: number;
    skipped: number;
  }> {
    if (items.length === 0) return { totalProcessed: 0, inserted: 0, skipped: 0 };

    const questions = items.map((i) => i.question);
    const existing = await this.prisma.multipleChoice.findMany({
      where: { question: { in: questions } },
      select: { question: true },
    });

    const existingSet = new Set(existing.map((e) => e.question));
    const toInsert = items.filter((i) => !existingSet.has(i.question));

    if (toInsert.length > 0) {
      await this.prisma.multipleChoice.createMany({ data: toInsert });
    }

    return { totalProcessed: items.length, inserted: toInsert.length, skipped: existing.length };
  }
}

function buildQuizFeedback(
  accuracy: number,
  correctCount: number,
  totalCount: number,
  countedAsCompleted: boolean,
): string {
  const wrong = totalCount - correctCount;

  if (!countedAsCompleted && totalCount < 5) {
    return `Session too short (${totalCount} questions). Complete at least 5 questions for this to count toward your progress.`;
  }

  if (accuracy === 100) {
    return `Perfect! ${correctCount}/${totalCount} correct. Excellent mastery of this topic.`;
  }

  if (accuracy >= 80) {
    return `Strong result — ${correctCount}/${totalCount} correct (${accuracy}%). Review the ${wrong} missed question${wrong > 1 ? 's' : ''} below.`;
  }

  if (accuracy >= 60) {
    return `${correctCount}/${totalCount} correct (${accuracy}%). Good effort — focus on the topics you missed and try again.`;
  }

  if (accuracy >= 40) {
    return `${correctCount}/${totalCount} correct (${accuracy}%). Review the grammar rules for the topics you missed before continuing.`;
  }

  return `${correctCount}/${totalCount} correct (${accuracy}%). This topic needs more practice — consider studying the grammar rules first.`;
}
