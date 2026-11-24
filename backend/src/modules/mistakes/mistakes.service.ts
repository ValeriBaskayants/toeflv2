import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ErrorCategory, Level, MasteryStatus, MistakeSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseMistakeTargetId, type MistakeTaskKind } from '../../constants/mistake-targets';
import { clip, firstMistakeState, mergeTags, nextMistakeState } from './utils/mistake-scheduling.util';

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

export interface DueTask {
  kind: MistakeTaskKind;
  taskId: string;
  dueCount: number;
  oldestDue: Date;
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

interface SpotAccumulator {
  topic: string;
  category: string;
  level: string;
  wrong: number;
  correct: number;
  unique: number;
  hasLearning: boolean;
}

const DEFAULT_LIST_LIMIT = 100;
const MAX_LIST_LIMIT = 200;
const DEFAULT_DUE_LIMIT = 20;
const WEAK_SPOT_SCAN_LIMIT = 2000;
const DUE_TASK_SCAN_LIMIT = 500;
const MAX_WEAK_SPOTS = 10;

function accuracyOf(correct: number, wrong: number): number {
  const total = correct + wrong;
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

function adjustedWeightOf(wrong: number, accuracy: number): number {
  return Math.round(wrong * Math.max(0, (100 - accuracy) / 100) * 10) / 10;
}

@Injectable()
export class MistakesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Called for EVERY answered item (correct ones too): a correct answer on a previously wrong item is what moves it
   * through the spaced-repetition ladder. A correct answer on an item with no mistake row is ignored.
   */
  async recordAttempt(params: RecordAttemptParams, retried = false): Promise<void> {
    const existing = await this.prisma.userMistake.findUnique({
      where: { userId_targetId: { userId: params.userId, targetId: params.targetId } },
    });

    const attempt = {
      userAnswer: clip(params.userAnswer),
      correctAnswer: clip(params.correctAnswer),
      isCorrect: params.isCorrect,
    };
    const now = new Date();

    if (existing === null) {
      if (params.isCorrect) {
        return;
      }

      const first = firstMistakeState(now);
      try {
        await this.prisma.userMistake.create({
          data: {
            userId: params.userId,
            targetId: params.targetId,
            source: params.source,
            topic: params.topic,
            category: params.category,
            level: params.level,
            tags: mergeTags([], params.tags),
            status: first.status,
            wrongCount: 1,
            correctCount: 0,
            easeFactor: first.easeFactor,
            nextReview: first.nextReview,
            attempts: { create: attempt },
          },
        });
      } catch (err: unknown) {
        // Double submit: both requests saw "no row" and tried to create it (unique [userId, targetId]).
        if (!retried && err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          return this.recordAttempt(params, true);
        }
        throw err;
      }
      return;
    }

    const next = nextMistakeState(
      { easeFactor: existing.easeFactor, status: existing.status, nextReview: existing.nextReview },
      params.isCorrect,
      now,
    );

    await this.prisma.userMistake.update({
      where: { id: existing.id },
      data: {
        wrongCount: params.isCorrect ? existing.wrongCount : existing.wrongCount + 1,
        correctCount: params.isCorrect ? existing.correctCount + 1 : existing.correctCount,
        easeFactor: next.easeFactor,
        status: next.status,
        nextReview: next.nextReview,
        tags: mergeTags(existing.tags, params.tags),
        attempts: { create: attempt },
      },
    });
  }

  async findAll(userId: string, source?: MistakeSource, limit: number = DEFAULT_LIST_LIMIT) {
    const where: Prisma.UserMistakeWhereInput = { userId };
    if (source !== undefined) {
      where.source = source;
    }

    const mistakes = await this.prisma.userMistake.findMany({
      where,
      include: {
        attempts: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, userAnswer: true, correctAnswer: true, isCorrect: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(limit, MAX_LIST_LIMIT),
    });

    const now = new Date();

    return mistakes.map((m) => {
      const accuracy = accuracyOf(m.correctCount, m.wrongCount);
      return {
        ...m,
        accuracy,
        dueForReview: m.nextReview !== null && m.nextReview <= now,
        adjustedWeight: Math.round(m.wrongCount * Math.max(0, (100 - accuracy) / 100)),
      };
    });
  }

  async getDueForReview(userId: string, limit: number = DEFAULT_DUE_LIMIT) {
    const mistakes = await this.prisma.userMistake.findMany({
      where: { userId, status: { not: 'MASTERED' }, nextReview: { lte: new Date() } },
      include: {
        attempts: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { userAnswer: true, correctAnswer: true },
        },
      },
      orderBy: { nextReview: 'asc' },
      take: Math.min(limit, MAX_LIST_LIMIT),
    });

    return mistakes.map((m) => ({
      id: m.id,
      targetId: m.targetId, // without it the client cannot route back to the task
      tags: m.tags,
      topic: m.topic,
      category: m.category,
      level: m.level,
      source: m.source,
      wrongCount: m.wrongCount,
      correctCount: m.correctCount,
      accuracy: accuracyOf(m.correctCount, m.wrongCount),
      nextReview: m.nextReview,
      recentAttempt: m.attempts[0] ?? null,
    }));
  }

  /**
   * Closes the review loop: due mistakes grouped by TASK. The client starts the task through its normal
   * /…/:id/start endpoint; that task's submit records every answer, so the schedule advances by itself.
   * Legacy rows without a known prefix are skipped.
   */
  async getDueTasks(userId: string, limit: number = DEFAULT_DUE_LIMIT): Promise<DueTask[]> {
    const rows = await this.prisma.userMistake.findMany({
      where: { userId, status: { not: 'MASTERED' }, nextReview: { lte: new Date() } },
      select: { targetId: true, nextReview: true },
      orderBy: { nextReview: 'asc' },
      take: DUE_TASK_SCAN_LIMIT,
    });

    const groups = new Map<string, DueTask>(); // insertion order = oldest due first
    for (const row of rows) {
      const parsed = parseMistakeTargetId(row.targetId);
      if (parsed === null || row.nextReview === null) {
        continue;
      }

      const key = `${parsed.kind}:${parsed.taskId}`;
      const group = groups.get(key);
      if (group === undefined) {
        groups.set(key, { kind: parsed.kind, taskId: parsed.taskId, dueCount: 1, oldestDue: row.nextReview });
      } else {
        group.dueCount++;
      }
    }

    return [...groups.values()].slice(0, Math.min(limit, MAX_LIST_LIMIT));
  }

  /** FIX: one topic used to appear several times (one row per status) with split counts and a skewed accuracy. */
  async getWeakSpots(userId: string): Promise<WeakSpot[]> {
    const rows = await this.prisma.userMistake.findMany({
      where: { userId, wrongCount: { gt: 0 }, status: { not: 'MASTERED' } },
      select: { topic: true, category: true, level: true, status: true, wrongCount: true, correctCount: true },
      orderBy: { wrongCount: 'desc' },
      take: WEAK_SPOT_SCAN_LIMIT,
    });

    const spots = new Map<string, SpotAccumulator>();
    for (const r of rows) {
      const key = `${r.topic}|${r.category}|${r.level}`;
      const acc = spots.get(key) ?? {
        topic: r.topic, category: r.category, level: r.level, wrong: 0, correct: 0, unique: 0, hasLearning: false,
      };
      acc.wrong += r.wrongCount;
      acc.correct += r.correctCount;
      acc.unique += 1;
      acc.hasLearning = acc.hasLearning || r.status === 'LEARNING';
      spots.set(key, acc);
    }

    return [...spots.values()]
      .map((s): WeakSpot => {
        const accuracy = accuracyOf(s.correct, s.wrong);
        return {
          topic: s.topic,
          category: s.category,
          level: s.level,
          status: s.hasLearning ? 'LEARNING' : 'REVIEWING',
          wrongCount: s.wrong,
          correctCount: s.correct,
          accuracy,
          adjustedWeight: adjustedWeightOf(s.wrong, accuracy),
          uniqueMistakesCount: s.unique,
        };
      })
      .sort((a, b) => b.adjustedWeight - a.adjustedWeight)
      .slice(0, MAX_WEAK_SPOTS);
  }

  async getHeatmapData(userId: string): Promise<HeatmapCell[]> {
    const spots = await this.prisma.userMistake.groupBy({
      by: ['topic', 'level'],
      where: { userId, status: { not: 'MASTERED' } },
      _sum: { wrongCount: true, correctCount: true },
      _count: { _all: true },
    });

    return spots
      .map((s) => {
        const wrong = s._sum.wrongCount ?? 0;
        const correct = s._sum.correctCount ?? 0;
        const total = wrong + correct;
        const accuracy = total > 0 ? correct / total : 0;
        const weight = Math.min(100, Math.round(wrong * (1 - accuracy) * 10));
        return { topic: s.topic, level: s.level, weight, count: s._count._all };
      })
      .sort((a, b) => b.weight - a.weight);
  }

  async markMastered(userId: string, mistakeId: string): Promise<{ status: MasteryStatus }> {
    const mistake = await this.prisma.userMistake.findUnique({ where: { id: mistakeId }, select: { userId: true } });

    if (mistake === null) {
      throw new NotFoundException('Mistake not found');
    }
    if (mistake.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

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