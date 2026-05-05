import { Injectable } from '@nestjs/common';
import { MistakeSource, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
 
@Injectable()
export class MistakesService {
  constructor(private readonly prisma: PrismaService) {}
 
  async findAll(userId: string, source?: MistakeSource) {
    const where: Prisma.UserMistakeWhereInput = { userId };
    if (source !== undefined) {
      where.source = source;
    }
 
    return this.prisma.userMistake.findMany({
      where,
      include: {
        attempts: {
          take:    5,
          orderBy: { createdAt: 'desc' },
          select: {
            id:            true,
            userAnswer:    true,
            correctAnswer: true,
            isCorrect:     true,
            createdAt:     true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
 
  async getWeakSpots(userId: string) {
    const spots = await this.prisma.userMistake.groupBy({
      by:    ['topic', 'category', 'level'],
      where: { userId, wrongCount: { gt: 0 } },
      _sum:   { wrongCount: true },
      _count: { _all: true },
      orderBy: { _sum: { wrongCount: 'desc' } },
      take:   10,
    });
 
    return spots.map((s) => ({
      topic:               s.topic,
      category:            s.category,
      level:               s.level,
      errorWeight:         s._sum.wrongCount ?? 0, // null-safe
      uniqueMistakesCount: s._count._all,
    }));
  }
}