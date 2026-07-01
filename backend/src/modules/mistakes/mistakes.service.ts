import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MasteryStatus, MistakeSource, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface WeakSpot {
  topic: string;
  category: string;
  level: string;
  wrongCount: number;
  correctCount: number;
  accuracy: number; 
  adjustedWeight: number; 
  uniqueMistakesCount: number;
  status: MasteryStatus;
  dueForReview: boolean; 
}

export interface HeatmapCell {
  topic: string;
  level: string;
  weight: number; 
  count: number; 
}

@Injectable()
export class MistakesService {
  constructor(private readonly prisma: PrismaService) {}

  

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
      orderBy: [
        { nextReview: 'asc' },
        { wrongCount: 'desc' },
      ],
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


  async getDueForReview(
    userId: string,
    limit = 20,
  ): Promise<
    Array<{
      id: string;
      topic: string;
      category: string;
      level: string;
      source: MistakeSource;
      wrongCount: number;
      correctCount: number;
      accuracy: number;
      nextReview: Date | null;
      recentAttempt: { userAnswer: string; correctAnswer: string } | null;
    }>
  > {
    const now = new Date();
    const mistakes = await this.prisma.userMistake.findMany({
      where: {
        userId,
        status: { not: 'MASTERED' },
        nextReview: { lte: now },
      },
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

    const now = new Date();

    const dueChecks = await this.prisma.userMistake.findMany({
      where: {
        userId,
        topic: { in: [...new Set(spots.map((s) => s.topic))] },
        status: { not: 'MASTERED' },
        nextReview: { lte: now },
      },
      select: { topic: true },
      distinct: ['topic'],
    });
    const dueTopics = new Set(dueChecks.map((d) => d.topic));

    const enriched: WeakSpot[] = spots.map((s) => {
      const wrong = s._sum.wrongCount ?? 0;
      const correct = s._sum.correctCount ?? 0;
      const total = wrong + correct;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

      const adjustedWeight = Math.round(wrong * Math.max(0, (100 - accuracy) / 100) * 10) / 10;

      return {
        topic: s.topic,
        category: s.category,
        level: s.level,
        wrongCount: wrong,
        correctCount: correct,
        accuracy,
        adjustedWeight,
        uniqueMistakesCount: s._count._all,
        status: s.status as MasteryStatus,
        dueForReview: dueTopics.has(s.topic),
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

        return {
          topic: s.topic,
          level: s.level,
          weight,
          count: s._count._all,
        };
      })
      .sort((a, b) => b.weight - a.weight);
  }

  async markMastered(userId: string, mistakeId: string): Promise<{ status: MasteryStatus }> {
    const mistake = await this.prisma.userMistake.findUnique({ where: { id: mistakeId } });

    if (mistake === null) throw new NotFoundException('Mistake not found');
    if (mistake.userId !== userId) throw new ForbiddenException('Access denied');

    const updated = await this.prisma.userMistake.update({
      where: { id: mistakeId },
      data: {
        status: 'MASTERED',
        nextReview: null,
      },
      select: { status: true },
    });

    return { status: updated.status };
  }

  async getDueCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.userMistake.count({
      where: {
        userId,
        status: { not: 'MASTERED' },
        nextReview: { lte: new Date() },
      },
    });
    return { count };
  }
}
