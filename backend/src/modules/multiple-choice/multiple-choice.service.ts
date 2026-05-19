import { Injectable } from '@nestjs/common';
import { Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { XP_RULES } from '../../constants/level-requirements';
import type { CreateMultipleChoiceDto } from './dto/bulk-create-multiple-choice.dto';
import type { GetMultipleChoiceDto } from './dto/get-multiple-choice.dto';
import type { SubmitMCSessionDto } from './dto/submit-session.dto';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

@Injectable()
export class MultipleChoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  async findAll(query: GetMultipleChoiceDto) {
    const where: Prisma.MultipleChoiceWhereInput = {};

    if (query.level !== undefined) {
      where.level = query.level;
    }
    if (query.difficulty !== undefined) {
      where.difficulty = query.difficulty;
    }
    if (query.topic !== undefined) {
      where.topic = { contains: query.topic, mode: 'insensitive' };
    }

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

  async submitSession(userId: string, dto: SubmitMCSessionDto, level: Level, timezone?: string) {
    const questionIds = dto.answers.map((a) => a.questionId);

    const questions = await this.prisma.multipleChoice.findMany({
      where: { id: { in: questionIds } },
    });

    const qMap = new Map(questions.map((q) => [q.id, q]));

    let correctCount = 0;
    const mistakeOps: Promise<unknown>[] = [];

    const results = dto.answers
      .map((a) => {
        const question = qMap.get(a.questionId);
        if (question === undefined) {
          return null;
        }

        const isCorrect = a.selectedIndex === question.correctIndex;
        if (isCorrect) {
          correctCount++;
        } else {
          mistakeOps.push(
            this.prisma.userMistake.upsert({
              where: { userId_targetId: { userId, targetId: a.questionId } },
              create: {
                userId,
                targetId: a.questionId,
                source: 'QUIZ',
                topic: question.topic,
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
      .filter((r) => r !== null);

    await Promise.all(mistakeOps);

    const xpEarned = correctCount * XP_RULES.QUIZ_CORRECT;

    await this.progress.recordActivity({
      userId,
      xpEarned,
      minutesSpent: Math.ceil(dto.answers.length * 0.5),
      timezone,
    });

    return {
      results,
      correctCount,
      totalCount: dto.answers.length,
      accuracy: Math.round((correctCount / dto.answers.length) * 100),
      xpEarned,
    };
  }

  async bulkCreate(items: CreateMultipleChoiceDto[]): Promise<{
    totalProcessed: number;
    inserted: number;
    skipped: number;
  }> {
    if (items.length === 0) {
      return { totalProcessed: 0, inserted: 0, skipped: 0 };
    }

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

    return {
      totalProcessed: items.length,
      inserted: toInsert.length,
      skipped: existing.length,
    };
  }
}
