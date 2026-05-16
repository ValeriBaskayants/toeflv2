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

export type SkillKey = 'grammar' | 'reading' | 'listening' | 'quiz';


const ACTIVITY_DAYS = 30;


@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(private readonly prisma: PrismaService) {}


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

    if (user === null)     { throw new NotFoundException('User not found'); }
    if (progress === null) { throw new NotFoundException('Level progress not found'); }

    return {
      currentLevel:     LEVEL_DISPLAY[user.currentLevel],
      totalXp:          user.totalXp,
      streak:           user.streak,
      progress,
      recentActivity,
      readinessPercent: this.computeReadiness(progress, user.currentLevel),
    };
  }


  async recordActivity(params: {
    userId:       string;
    xpEarned:     number;
    minutesSpent: number;
    timezone?:    string;
  }): Promise<void> {
    const today = this.localDateString(params.timezone);

    await this.prisma.$transaction(async (tx) => {
      await tx.dailyActivity.upsert({
        where:  { userId_date: { userId: params.userId, date: today } },
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

      const newStreak = await this.calculateStreak(params.userId, today, tx);

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


  async recordSkillCompletion(params: {
    userId:   string;
    skill:    SkillKey;
    accuracy: number; 
    xpEarned: number;
    timezone?: string;
  }): Promise<void> {
    const progress = await this.prisma.levelProgress.findUnique({
      where: { userId: params.userId },
    });

    if (progress === null) {
      throw new NotFoundException('Level progress not found');
    }

    const current = progress[params.skill] as { completed: number; accuracy: number };
    const oldCompleted = current.completed;
    const oldAccuracy  = current.accuracy;

    const newCompleted = oldCompleted + 1;
    const newAccuracy  = Math.round(
      (oldAccuracy * oldCompleted + params.accuracy) / newCompleted,
    );

    await this.prisma.levelProgress.update({
      where: { userId: params.userId },
      data:  {
        [params.skill]: {
          ...current,
          completed: newCompleted,
          accuracy:  newAccuracy,
        },
      },
    });

    await this.recordActivity({
      userId:       params.userId,
      xpEarned:     params.xpEarned,
      minutesSpent: 2, 
      timezone:     params.timezone,
    });

    await this.checkAndUnlockTest(params.userId);
  }


  async recordListeningCompletion(params: {
    userId:    string;
    accuracy:  number;
    xpEarned:  number;
    timezone?: string;
  }): Promise<void> {
    return this.recordSkillCompletion({
      ...params,
      skill: 'listening',
    });
  }


  async recordVocabularyLearned(params: {
    userId:    string;
    xpEarned:  number;
    timezone?: string;
  }): Promise<void> {
    const progress = await this.prisma.levelProgress.findUnique({
      where:  { userId: params.userId },
      select: { vocabulary: true },
    });

    if (progress === null) {
      throw new NotFoundException('Level progress not found');
    }

    const current = progress.vocabulary as { required: number; learned: number };

    await this.prisma.levelProgress.update({
      where: { userId: params.userId },
      data:  { vocabulary: { ...current, learned: current.learned + 1 } },
    });

    await this.recordActivity({
      userId:       params.userId,
      xpEarned:     params.xpEarned,
      minutesSpent: 1,
      timezone:     params.timezone,
    });

    await this.checkAndUnlockTest(params.userId);
  }


  async recordWritingCompletion(params: {
    userId:    string;
    score:     number; 
    xpEarned:  number;
    timezone?: string;
  }): Promise<void> {
    const progress = await this.prisma.levelProgress.findUnique({
      where:  { userId: params.userId },
      select: { writing: true },
    });

    if (progress === null) {
      throw new NotFoundException('Level progress not found');
    }

    const current = progress.writing as {
      required: number; completed: number; avgScore: number;
    };

    const newCompleted = current.completed + 1;
    const newAvgScore = Math.round(
      (current.avgScore * current.completed + params.score) / newCompleted,
    );

    await this.prisma.levelProgress.update({
      where: { userId: params.userId },
      data:  {
        writing: { ...current, completed: newCompleted, avgScore: newAvgScore },
      },
    });

    await this.recordActivity({
      userId:       params.userId,
      xpEarned:     params.xpEarned,
      minutesSpent: 5,
      timezone:     params.timezone,
    });

    await this.checkAndUnlockTest(params.userId);
  }


  async checkAndUnlockTest(userId: string): Promise<boolean> {
    const [user, progress] = await Promise.all([
      this.prisma.user.findUnique({
        where:  { id: userId },
        select: { currentLevel: true },
      }),
      this.prisma.levelProgress.findUnique({ where: { userId } }),
    ]);

    if (user === null || progress === null) { return false; }

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


  async levelUp(userId: string): Promise<{ newLevel: Level } | null> {
    const user = await this.prisma.user.findUnique({
      where:  { id: userId },
      select: { currentLevel: true },
    });

    if (user === null) { throw new NotFoundException('User not found'); }

    const nextLevel = getNextLevel(user.currentLevel);
    if (nextLevel === null) { return null; }

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

  private computeReadiness(progress: LevelProgress, level: Level): number {
    const req = LEVEL_REQUIREMENTS[level];

    function skillPct(
      completed:   number,
      required:    number,
      accuracy:    number,
      accuracyMin: number,
    ): number {
      if (required === 0) { return 100; }
      const quantityPct   = Math.min(100, (completed / required) * 100);
      const accuracyRatio = accuracyMin > 0
        ? Math.min(1, accuracy / accuracyMin)
        : 1;
      return Math.round(quantityPct * Math.max(0.4, accuracyRatio));
    }

    const percentages = [
      skillPct(
        progress.grammar.completed,
        req.grammar.required,
        progress.grammar.accuracy,
        req.grammar.accuracyMin,
      ),
      req.vocabulary.required > 0
        ? Math.min(100, Math.round((progress.vocabulary.learned / req.vocabulary.required) * 100))
        : 100,
      skillPct(
        progress.reading.completed,
        req.reading.required,
        progress.reading.accuracy,
        req.reading.accuracyMin,
      ),
      (() => {
        if (req.writing.required === 0) { return 100; }
        const qPct       = Math.min(100, (progress.writing.completed / req.writing.required) * 100);
        const scoreRatio = req.writing.avgScoreMin > 0
          ? Math.min(1, progress.writing.avgScore / req.writing.avgScoreMin)
          : 1;
        return Math.round(qPct * Math.max(0.4, scoreRatio));
      })(),
      skillPct(
        progress.listening.completed,
        req.listening.required,
        progress.listening.accuracy,
        req.listening.accuracyMin,
      ),
      skillPct(
        progress.quiz.completed,
        req.quiz.required,
        progress.quiz.accuracy,
        req.quiz.accuracyMin,
      ),
    ];

    const avg = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    return Math.round(avg);
  }


  private async calculateStreak(
    userId: string,
    today:  string,
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
  ): Promise<number> {
    const yearAgo = this.cutoffDateString(365);

    const activities = await tx.dailyActivity.findMany({
      where:   { userId, date: { gte: yearAgo } },
      select:  { date: true },
      orderBy: { date: 'desc' },
    });

    const dates   = new Set(activities.map((a) => a.date));
    let streak    = 0;
    let checking  = today;

    while (dates.has(checking)) {
      streak++;
      checking = this.subtractDay(checking);
    }

    return streak;
  }

  private localDateString(timezone?: string): string {
    const tz = timezone ?? 'UTC';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year:  'numeric',
      month: '2-digit',
      day:   '2-digit',
    }).format(new Date());
  }

  private cutoffDateString(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }

  private subtractDay(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
}