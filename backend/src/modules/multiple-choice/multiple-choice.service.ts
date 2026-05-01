import { Injectable } from '@nestjs/common';
import { Difficulty, Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMultipleChoiceDto } from './dto/bulk-create-multiple-choice.dto';
import type { GetMultipleChoiceDto } from './dto/get-multiple-choice.dto';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

@Injectable()
export class MultipleChoiceService {
  constructor(private readonly prisma: PrismaService) {}

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
      pipeline: [
        { $match: { level } },
        { $sample: { size: count } },
      ],
    });

    return (raw as unknown as Array<Record<string, unknown>>).map((item) => {
      const { _id, ...rest } = item;
      const oid = _id as { $oid?: string } | string | null;
      return {
        ...rest,
        id: typeof oid === 'object' && oid !== null && '$oid' in oid
          ? oid.$oid
          : String(oid),
      };
    });
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
      await this.prisma.multipleChoice.createMany({
        data: toInsert,
      });
    }

    return {
      totalProcessed: items.length,
      inserted: toInsert.length,
      skipped: existing.length,
    };
  }
}