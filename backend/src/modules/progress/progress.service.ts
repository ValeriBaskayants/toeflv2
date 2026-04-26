import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Level, LevelProgress, DailyActivity } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  LEVEL_REQUIREMENTS,
  LEVEL_DISPLAY,
  buildInitialProgress,
  getNextLevel,
} from '../../constants/level-requirements';

export interface DashboardResponse {
  currentLevel:     string;
  totalXp:          number;
  streak:           number;
  progress:         LevelProgress;
  recentActivity:   DailyActivity[];
  readinessPercent: number;
}

const ACTIVITY_DAYS = 30;

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── getDashboard ───────────────────────────────────────────────────────────
  // Three parallel DB queries — no sequential waterfall.

  async getDashboard(userId: string): Promise<DashboardResponse> {
    const cutoffDate = this.cutoffDateString(ACTIVITY_DAYS);

    const [user, progress, recentActivity] = await Promise.all([
      this.prisma.user.findUnique({
        where:  { id: userId },
        select: { currentLevel: true, totalXp: true, streak: true },
      }),
      this.prisma.levelProgress.findUnique({ where: { userId } }),
      this.prisma.dailyActivity.findMany({
        where:   { userId, date: { gte: cutoffDate } },
        orderBy: { date: 'asc' },
      }),
    ]);

    if (user === null) {
      throw new NotFoundException('User not found');
    }

    if (progress === null) {
      throw new NotFoundException('Level progress not found');
    }

    return {
      currentLevel:     LEVEL_DISPLAY[user.currentLevel],
      totalXp:          user.totalXp,
      streak:           user.streak,
      progress,
      recentActivity,
      readinessPercent: this.computeReadiness(progress, user.currentLevel),
    };
  }

  async getLevelProgress(userId: string): Promise<LevelProgress> {
    const progress = await this.prisma.levelProgress.findUnique({
      where: { userId },
    });

    if (progress === null) {
      throw new NotFoundException('Level progress not found');
    }

    return progress;
  }

  // ── recordActivity ─────────────────────────────────────────────────────────
  // BUG FIX: previous version calculated newStreak but never passed it to
  // user.update — totalXp and streak were silently never written to the DB.
  // Now both writes happen atomically inside the same transaction.

  async recordActivity(params: {
    userId:       string;
    xpEarned:     number;
    minutesSpent: number;
  }): Promise<void> {
    const today = this.todayString();

    await this.prisma.$transaction(async (tx) => {
      // 1. Upsert today's activity record
      await tx.dailyActivity.upsert({
        where: { userId_date: { userId: params.userId, date: today } },
        create: {
          userId:        params.userId,
          date:          today,
          xpEarned:      params.xpEarned,
          minutesSpent:  params.minutesSpent,
          sessionsCount: 1,
        },
        update: {
          xpEarned:      { increment: params.xpEarned },
          minutesSpent:  { increment: params.minutesSpent },
          sessionsCount: { increment: 1 },
        },
      });

      // 2. Recalculate streak using the transaction client (reads consistent state)
      const newStreak = await this.calculateStreak(params.userId, today, tx);

      // 3. Update User — this was the missing step in the original code
      await tx.user.update({
        where: { id: params.userId },
        data:  {
          totalXp:          { increment: params.xpEarned },
          streak:           newStreak,
          lastActivityDate: new Date(),
        },
      });
    });
  }

  // ── checkAndUnlockTest ─────────────────────────────────────────────────────

  async checkAndUnlockTest(userId: string): Promise<boolean> {
    const [user, progress] = await Promise.all([
      this.prisma.user.findUnique({
        where:  { id: userId },
        select: { currentLevel: true },
      }),
      this.prisma.levelProgress.findUnique({ where: { userId } }),
    ]);

    if (user === null || progress === null) {
      return false;
    }

    const readiness = this.computeReadiness(progress, user.currentLevel);

    if (readiness >= 100 && !progress.isReadyForTest) {
      await this.prisma.levelProgress.update({
        where: { userId },
        data:  { isReadyForTest: true, testUnlockedAt: new Date() },
      });

      this.logger.log('LEVEL_TEST_UNLOCKED', { userId, level: user.currentLevel });
      return true;
    }

    return false;
  }

  // ── levelUp ───────────────────────────────────────────────────────────────

  async levelUp(userId: string): Promise<{ newLevel: Level } | null> {
    const user = await this.prisma.user.findUnique({
      where:  { id: userId },
      select: { currentLevel: true },
    });

    if (user === null) {
      throw new NotFoundException('User not found');
    }

    const nextLevel = getNextLevel(user.currentLevel);

    if (nextLevel === null) {
      return null; // Already at C2
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.levelProgress.update({
        where: { userId },
        data:  {
          ...buildInitialProgress(nextLevel),
          isReadyForTest: false,
          testUnlockedAt: null,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data:  { currentLevel: nextLevel },
      });
    });

    this.logger.log('LEVEL_UP', { userId, from: user.currentLevel, to: nextLevel });

    return { newLevel: nextLevel };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private computeReadiness(progress: LevelProgress, level: Level): number {
    const req = LEVEL_REQUIREMENTS[level];

    const percentages = [
      req.grammar.required    > 0 ? Math.min(100, (progress.grammar.completed    / req.grammar.required)    * 100) : 100,
      req.vocabulary.required > 0 ? Math.min(100, (progress.vocabulary.learned   / req.vocabulary.required) * 100) : 100,
      req.reading.required    > 0 ? Math.min(100, (progress.reading.completed    / req.reading.required)    * 100) : 100,
      req.writing.required    > 0 ? Math.min(100, (progress.writing.completed    / req.writing.required)    * 100) : 100,
      req.listening.required  > 0 ? Math.min(100, (progress.listening.completed  / req.listening.required)  * 100) : 100,
      req.quiz.required       > 0 ? Math.min(100, (progress.quiz.completed       / req.quiz.required)       * 100) : 100,
    ];

    const avg = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    return Math.round(avg);
  }

  private async calculateStreak(
    userId: string,
    today: string,
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
  ): Promise<number> {
    const yearAgo = this.cutoffDateString(365);

    const activities = await tx.dailyActivity.findMany({
      where:   { userId, date: { gte: yearAgo } },
      select:  { date: true },
      orderBy: { date: 'desc' },
    });

    const dates = new Set(activities.map((a) => a.date));

    let streak = 0;
    let checking = today;

    while (dates.has(checking)) {
      streak++;
      checking = this.subtractDay(checking);
    }

    return streak;
  }

  private todayString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private cutoffDateString(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }

  private subtractDay(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
}