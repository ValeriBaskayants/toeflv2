import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ErrorCategory, Level, MasteryStatus, MistakeSource, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface WeakSpot {
  topic: string;
  category: string;
  level: string;
  status: MasteryStatus;
  wrongCount: number;
  correctCount: number;
  accuracy: number;
  adjustedWeight: number;
  uniqueMistakesCount: number;
}

export interface HeatmapCell {
  topic: string;
  level: string;
  weight: number;
  count: number;
}

export interface RecordAttemptParams {
  userId: string;
  targetId: string;
  source: MistakeSource;
  category: ErrorCategory;
  topic: string;
  level: Level;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  tags?: string[];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

@Injectable()
export class MistakesService {
  constructor(private readonly prisma: PrismaService) {}

  async recordAttempt(params: RecordAttemptParams): Promise<void> {
    const existing = await this.prisma.userMistake.findUnique({
      where: { userId_targetId: { userId: params.userId, targetId: params.targetId } },
    });

    if (existing === null) {
      if (params.isCorrect) {
        return;
      }

      const created = await this.prisma.userMistake.create({
        data: {
          userId: params.userId,
          targetId: params.targetId,
          source: params.source,
          topic: params.topic,
          category: params.category,
          level: params.level,
          tags: params.tags ?? [],
          status: 'LEARNING',
          wrongCount: 1,
          correctCount: 0,
          easeFactor: 2.5,
          nextReview: addDays(new Date(), 1),
        },
      });

      await this.prisma.mistakeAttempt.create({
        data: {
          userMistakeId: created.id,
          userAnswer: params.userAnswer,
          correctAnswer: params.correctAnswer,
          isCorrect: false,
        },
      });
      return;
    }

    const next = this.applySpacedRepetition(existing.easeFactor, existing.status, params.isCorrect);

    await this.prisma.userMistake.update({
      where: { id: existing.id },
      data: {
        wrongCount: params.isCorrect ? existing.wrongCount : existing.wrongCount + 1,
        correctCount: params.isCorrect ? existing.correctCount + 1 : existing.correctCount,
        easeFactor: next.easeFactor,
        status: next.status,
        nextReview: next.status === 'MASTERED' ? null : addDays(new Date(), next.intervalDays),
        tags: params.tags !== undefined && params.tags.length > 0 ? params.tags : existing.tags,
      },
    });

    await this.prisma.mistakeAttempt.create({
      data: {
        userMistakeId: existing.id,
        userAnswer: params.userAnswer,
        correctAnswer: params.correctAnswer,
        isCorrect: params.isCorrect,
      },
    });
  }

  private applySpacedRepetition(
    currentEase: number,
    currentStatus: MasteryStatus,
    isCorrect: boolean,
  ): { easeFactor: number; intervalDays: number; status: MasteryStatus } {
    if (!isCorrect) {
      return { easeFactor: Math.max(1.3, currentEase - 0.2), intervalDays: 1, status: 'LEARNING' };
    }

    const easeFactor = Math.min(2.8, currentEase + 0.1);
    const status: MasteryStatus = currentStatus === 'LEARNING' ? 'REVIEWING' : 'MASTERED';
    const intervalDays = Math.round(easeFactor * 2);

    return { easeFactor, intervalDays, status };
  }

  async findAll(userId: string, source?: MistakeSource) {
    const where: Prisma.UserMistakeWhereInput = { userId };
    if (source !== undefined) where.source = source;

    const mistakes = await this.prisma.userMistake.findMany({
      where,
      include: {
        attempts: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            userAnswer: true,
            correctAnswer: true,
            isCorrect: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ nextReview: 'asc' }, { wrongCount: 'desc' }],
    });

    const now = new Date();

    return mistakes.map((m) => {
      const total = m.wrongCount + m.correctCount;
      const accuracy = total > 0 ? Math.round((m.correctCount / total) * 100) : 0;
      const dueForReview = m.nextReview !== null && m.nextReview <= now;

      return {
        ...m,
        accuracy,
        dueForReview,
        adjustedWeight: Math.round(m.wrongCount * Math.max(0, (100 - accuracy) / 100)),
      };
    });
  }

  async getDueForReview(userId: string, limit = 20) {
    const now = new Date();

    const mistakes = await this.prisma.userMistake.findMany({
      where: { userId, status: { not: 'MASTERED' }, nextReview: { lte: now } },
      include: {
        attempts: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { userAnswer: true, correctAnswer: true },
        },
      },
      orderBy: { nextReview: 'asc' },
      take: limit,
    });

    return mistakes.map((m) => {
      const total = m.wrongCount + m.correctCount;
      const accuracy = total > 0 ? Math.round((m.correctCount / total) * 100) : 0;

      return {
        id: m.id,
        topic: m.topic,
        category: m.category,
        level: m.level,
        source: m.source,
        wrongCount: m.wrongCount,
        correctCount: m.correctCount,
        accuracy,
        nextReview: m.nextReview,
        recentAttempt: m.attempts[0] ?? null,
      };
    });
  }

  async getWeakSpots(userId: string): Promise<WeakSpot[]> {
    const spots = await this.prisma.userMistake.groupBy({
      by: ['topic', 'category', 'level', 'status'],
      where: { userId, wrongCount: { gt: 0 } },
      _sum: { wrongCount: true, correctCount: true },
      _count: { _all: true },
      orderBy: { _sum: { wrongCount: 'desc' } },
      take: 20,
    });

    const enriched: WeakSpot[] = spots.map((s) => {
      const wrong = s._sum.wrongCount ?? 0;
      const correct = s._sum.correctCount ?? 0;
      const total = wrong + correct;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

      return {
        topic: s.topic,
        category: s.category,
        level: s.level,
        status: s.status,
        wrongCount: wrong,
        correctCount: correct,
        accuracy,
        adjustedWeight: Math.round(wrong * Math.max(0, (100 - accuracy) / 100) * 10) / 10,
        uniqueMistakesCount: s._count._all,
      };
    });

    return enriched
      .filter((s) => s.status !== 'MASTERED')
      .sort((a, b) => b.adjustedWeight - a.adjustedWeight)
      .slice(0, 10);
  }

  async getHeatmapData(userId: string): Promise<HeatmapCell[]> {
    const spots = await this.prisma.userMistake.groupBy({
      by: ['topic', 'level'],
      where: { userId },
      _sum: { wrongCount: true, correctCount: true },
      _count: { _all: true },
    });

    return spots
      .map((s) => {
        const wrong = s._sum.wrongCount ?? 0;
        const correct = s._sum.correctCount ?? 0;
        const total = wrong + correct;
        const accuracy = total > 0 ? correct / total : 0;
        const rawWeight = wrong * (1 - accuracy);
        const weight = Math.min(100, Math.round(rawWeight * 10));

        return { topic: s.topic, level: s.level, weight, count: s._count._all };
      })
      .sort((a, b) => b.weight - a.weight);
  }

  async markMastered(userId: string, mistakeId: string): Promise<{ status: MasteryStatus }> {
    const mistake = await this.prisma.userMistake.findUnique({ where: { id: mistakeId } });

    if (mistake === null) throw new NotFoundException('Mistake not found');
    if (mistake.userId !== userId) throw new ForbiddenException('Access denied');

    const updated = await this.prisma.userMistake.update({
      where: { id: mistakeId },
      data: { status: 'MASTERED', nextReview: null },
      select: { status: true },
    });

    return { status: updated.status };
  }

  async getDueCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.userMistake.count({
      where: { userId, status: { not: 'MASTERED' }, nextReview: { lte: new Date() } },
    });
    return { count };
  }
}
