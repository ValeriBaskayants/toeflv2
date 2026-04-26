import { Injectable } from '@nestjs/common';
import { Difficulty, Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateExerciseDto } from './dto/bulk-create-exercise.dto';
import type { GetExercisesDto } from './dto/get-exercises.dto';

// Default page size when no limit is requested
const DEFAULT_LIMIT = 50;
// Hard ceiling — matches Prod standard (max 100 elements)
const MAX_LIMIT = 100;

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GetExercisesDto) {
    const where: Prisma.ExerciseWhereInput = {};

    if (query.level !== undefined)      { where.level      = query.level; }
    if (query.difficulty !== undefined) { where.difficulty = query.difficulty; }
    if (query.topic !== undefined)      { where.topic      = { contains: query.topic, mode: 'insensitive' }; }

    // FIX: was `query.limit || 50` — falsy check fails on limit=0.
    // Now: explicit undefined check + hard MAX_LIMIT cap.
    const take = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    return this.prisma.exercise.findMany({
      where,
      orderBy: [{ level: 'asc' }, { difficulty: 'asc' }],
      take,
    });
  }

  async getTopics(level?: Level) {
    const exercises = await this.prisma.exercise.findMany({
      where:    level !== undefined ? { level } : undefined,
      select:   { topic: true },
      distinct: ['topic'],
    });

    return exercises.map((ex) => ex.topic).sort();
  }

  // ── bulkCreate ─────────────────────────────────────────────────────────────
  // FIX: was accepting `any[]` — now uses typed CreateExerciseDto[].
  // FIX: sentence is @unique in schema — used as idempotency key.
  // FIX: skippedCount now counts items that didn't pass the DB dedup check.

  async bulkCreate(exercises: CreateExerciseDto[]): Promise<{
    totalProcessed: number;
    inserted:       number;
    skipped:        number;
  }> {
    if (exercises.length === 0) {
      return { totalProcessed: 0, inserted: 0, skipped: 0 };
    }

    const sentences = exercises.map((ex) => ex.sentence);

    const existing = await this.prisma.exercise.findMany({
      where:  { sentence: { in: sentences } },
      select: { sentence: true },
    });

    const existingSet = new Set(existing.map((e) => e.sentence));
    const toInsert = exercises.filter((ex) => !existingSet.has(ex.sentence));

    if (toInsert.length > 0) {
      await this.prisma.exercise.createMany({
        data:           toInsert,
      });
    }

    return {
      totalProcessed: exercises.length,
      inserted:       toInsert.length,
      skipped:        existing.length,
    };
  }
}