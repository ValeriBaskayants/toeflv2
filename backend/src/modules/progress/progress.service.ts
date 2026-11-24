import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { DailyActivity, Level, LevelProgress } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { localDateString } from '../../common/utils/timezone.util';
import {
  LEVEL_REQUIREMENTS, LEVEL_DISPLAY, buildInitialProgress, getNextLevel, emaAccuracy, computeSkillSMS,
  computeWritingSMS, computeXP, isSessionCountable, getStreakMultiplier, XP_BASE,
  WEAKNESS_GATE_THRESHOLD, WEAKNESS_GATE_CAP,
} from '../../constants/level-requirements';

export interface SkillBreakdown {
  sms: number;
  completed: number;
  required: number;
  accuracy: number;
  accuracyMin: number;
  remainingCount: number;
  accuracyGap: number;
  isBottleneck: boolean;
}

export interface ModuleStat {
  completedCount: number;
  avgScore: number;
}

export interface DashboardResponse {
  currentLevel: string;
  totalXp: number;
  streak: number;
  streakMultiplier: number;
  progress: LevelProgress;
  recentActivity: DailyActivity[];
  readinessPercent: number;
  skillBreakdown: Record<string, SkillBreakdown>;
  weakestSkill: string;
  nextMilestone: string;
  testUnlocked: boolean;
  moduleStats: { scramble: ModuleStat; speaking: ModuleStat };
}

const SKILL_KEYS = ['grammar', 'reading', 'listening', 'quiz', 'speaking', 'scramble'] as const;
export type SkillKey = (typeof SKILL_KEYS)[number];

interface ProgressStatsShape {
  completed: number;
  accuracy: number;
}

interface VocabularyStatsShape {
  required: number;
  learned: number;
}

interface WritingStatsShape {
  completed: number;
  avgScore: number;
  required: number;
}

interface StreakSource {
  streak: number;
  lastActivityDate: Date | null;
}

const ACTIVITY_DAYS = 30;
const DEFAULT_SKILL_MINUTES = 2;

const SKILL_BASE_XP: Record<SkillKey, number> = {
  grammar: XP_BASE.GRAMMAR_CORRECT,
  reading: XP_BASE.READING_COMPLETED,
  listening: XP_BASE.LISTENING_MEDIUM,
  quiz: XP_BASE.QUIZ_CORRECT,
  speaking: XP_BASE.SPEAKING_BASE,
  scramble: XP_BASE.SCRAMBLE_BASE,
};

const SKILL_LABELS: Record<string, string> = {
  grammar: 'grammar exercises',
  vocabulary: 'vocabulary words',
  reading: 'reading tasks',
  writing: 'writing submissions',
  listening: 'listening sessions',
  quiz: 'quiz questions',
  speaking: 'speaking sessions',
  scramble: 'sentence-building exercises',
};

// Users created before speaking/scramble existed have no such sub-document (needs the optional-field schema change).
function statsOf(raw: ProgressStatsShape | null | undefined): ProgressStatsShape {
  return raw ?? { completed: 0, accuracy: 0 };
}

function buildEntry(sms: number, completed: number, required: number, accuracy: number, accuracyMin: number): SkillBreakdown {
  return {
    sms, completed, required, accuracy, accuracyMin,
    remainingCount: Math.max(0, required - completed),
    accuracyGap: Math.max(0, accuracyMin - accuracy),
    isBottleneck: sms < WEAKNESS_GATE_THRESHOLD,
  };
}

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(private readonly prisma: PrismaService) { }

  // ── Streak ──
  // The stored streak was only recomputed on activity, so a user away for a week kept the old streak AND its XP multiplier.
  // Effective streak = stored streak if the last activity was today/yesterday (in the user's timezone), otherwise 0.

  async getEffectiveStreak(userId: string, timezone?: string): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { streak: true, lastActivityDate: true } });
    return user === null ? 0 : this.effectiveStreakOf(user, timezone);
  }

  private effectiveStreakOf(user: StreakSource, timezone?: string): number {
    if (user.lastActivityDate === null || user.streak <= 0) {
      return 0;
    }
    const today = localDateString(timezone);
    const last = localDateString(timezone, user.lastActivityDate);
    return last === today || last === this.subtractDay(today) ? user.streak : 0;
  }

  // ── Dashboard ──

  async getDashboard(userId: string, timezone?: string): Promise<DashboardResponse> {
    const [user, progress, recentActivity, scrambleAgg, speakingAgg] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { currentLevel: true, totalXp: true, streak: true, lastActivityDate: true },
      }),
      this.prisma.levelProgress.findUnique({ where: { userId } }),
      this.prisma.dailyActivity.findMany({
        where: { userId, date: { gte: this.cutoffDateString(ACTIVITY_DAYS) } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.scrambleSession.aggregate({
        where: { userId, status: 'COMPLETED' },
        _count: { _all: true },
        _avg: { finalScore: true },
      }),
      this.prisma.speakingRepeatSession.aggregate({
        where: { userId, status: 'COMPLETED' },
        _count: { _all: true },
        _avg: { finalScore: true },
      }),
    ]);

    if (user === null) {
      throw new NotFoundException('User not found');
    }
    if (progress === null) {
      throw new NotFoundException('Level progress not found');
    }

    const streak = this.effectiveStreakOf(user, timezone);
    const readiness = this.computeReadiness(progress, user.currentLevel);

    return {
      currentLevel: LEVEL_DISPLAY[user.currentLevel],
      totalXp: user.totalXp,
      streak,
      streakMultiplier: getStreakMultiplier(streak),
      progress,
      recentActivity,
      readinessPercent: readiness.readinessPercent,
      skillBreakdown: readiness.skillBreakdown,
      weakestSkill: readiness.weakestSkill,
      nextMilestone: this.buildNextMilestone(readiness.skillBreakdown, readiness.weakestSkill),
      testUnlocked: progress.isReadyForTest,
      moduleStats: {
        scramble: { completedCount: scrambleAgg._count._all, avgScore: Math.round(scrambleAgg._avg.finalScore ?? 0) },
        speaking: { completedCount: speakingAgg._count._all, avgScore: Math.round(speakingAgg._avg.finalScore ?? 0) },
      },
    };
  }

  // ── Activity / completions (called by every practice module) ──

  async recordActivity(params: { userId: string; xpEarned: number; minutesSpent: number; timezone?: string }): Promise<void> {
    const today = localDateString(params.timezone);

    await this.prisma.$transaction(async (tx) => {
      await tx.dailyActivity.upsert({
        where: { userId_date: { userId: params.userId, date: today } },
        create: {
          userId: params.userId, date: today, xpEarned: params.xpEarned,
          minutesSpent: params.minutesSpent, sessionsCount: 1,
        },
        update: {
          xpEarned: { increment: params.xpEarned },
          minutesSpent: { increment: params.minutesSpent },
          sessionsCount: { increment: 1 },
        },
      });

      const newStreak = await this.calculateStreak(params.userId, today, tx);

      await tx.user.update({
        where: { id: params.userId },
        data: { totalXp: { increment: params.xpEarned }, streak: newStreak, lastActivityDate: new Date() },
      });
    });
  }

  async recordSkillCompletion(params: {
    userId: string;
    skill: SkillKey;
    accuracy: number;
    xpEarned?: number;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    timezone?: string;
    minutesSpent?: number;
    units?: number;
  }): Promise<{ xpEarned: number; countedAsCompleted: boolean }> {
    const [user, progress] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: params.userId },
        select: { streak: true, lastActivityDate: true, currentLevel: true },
      }),
      this.prisma.levelProgress.findUnique({ where: { userId: params.userId } }),
    ]);

    if (user === null) {
      throw new NotFoundException('User not found');
    }
    if (progress === null) {
      throw new NotFoundException('Level progress not found');
    }

    const current = statsOf(progress[params.skill] as ProgressStatsShape | null);
    const countedAsCompleted = isSessionCountable(params.accuracy);
    const newAccuracy = emaAccuracy(current.completed, current.accuracy, params.accuracy);
    const units = Math.max(1, params.units ?? 1);
    const newCompleted = countedAsCompleted ? current.completed + units : current.completed;

    const xpEarned =
      params.xpEarned ??
      computeXP({
        base: SKILL_BASE_XP[params.skill],
        difficulty: params.difficulty,
        streak: this.effectiveStreakOf(user, params.timezone),
        accuracy: params.accuracy,
      });

    await this.prisma.levelProgress.update({
      where: { userId: params.userId },
      data: {
        // `required` is rewritten from the live table so old documents never carry stale/missing values
        [params.skill]: {
          required: LEVEL_REQUIREMENTS[user.currentLevel][params.skill].required,
          completed: newCompleted,
          accuracy: newAccuracy,
        },
      },
    });

    await this.recordActivity({
      userId: params.userId,
      xpEarned,
      minutesSpent: params.minutesSpent ?? DEFAULT_SKILL_MINUTES,
      timezone: params.timezone,
    });

    if (countedAsCompleted) {
      await this.checkAndUnlockTest(params.userId);
    }

    return { xpEarned, countedAsCompleted };
  }

  async recordListeningCompletion(params: { userId: string; accuracy: number; xpEarned: number; timezone?: string }): Promise<void> {
    await this.recordSkillCompletion({ ...params, skill: 'listening' });
  }

  async recordVocabularyLearned(params: { userId: string; timezone?: string }): Promise<{ xpEarned: number }> {
    const [user, progress] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: params.userId }, select: { streak: true, lastActivityDate: true } }),
      this.prisma.levelProgress.findUnique({ where: { userId: params.userId }, select: { vocabulary: true } }),
    ]);

    if (progress === null) {
      throw new NotFoundException('Level progress not found');
    }

    const current = progress.vocabulary as VocabularyStatsShape;
    const streak = user === null ? 0 : this.effectiveStreakOf(user, params.timezone);
    const xpEarned = computeXP({ base: XP_BASE.VOCABULARY_MASTERED, streak });

    await this.prisma.levelProgress.update({
      where: { userId: params.userId },
      data: { vocabulary: { ...current, learned: current.learned + 1 } },
    });
    await this.recordActivity({ userId: params.userId, xpEarned, minutesSpent: 1, timezone: params.timezone });
    await this.checkAndUnlockTest(params.userId);

    return { xpEarned };
  }

  async recordWritingCompletion(params: { userId: string; score: number; timezone?: string }): Promise<{ xpEarned: number }> {
    const [user, progress] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: params.userId }, select: { streak: true, lastActivityDate: true } }),
      this.prisma.levelProgress.findUnique({ where: { userId: params.userId }, select: { writing: true } }),
    ]);

    if (progress === null) {
      throw new NotFoundException('Level progress not found');
    }

    const current = progress.writing as WritingStatsShape;
    const streak = user === null ? 0 : this.effectiveStreakOf(user, params.timezone);
    const xpEarned = computeXP({
      base: Math.round(XP_BASE.WRITING_BASE + params.score * XP_BASE.WRITING_SCORE_MULT),
      streak,
      accuracy: params.score,
    });

    await this.prisma.levelProgress.update({
      where: { userId: params.userId },
      data: {
        writing: {
          ...current,
          completed: current.completed + 1,
          avgScore: emaAccuracy(current.completed, current.avgScore, params.score),
        },
      },
    });
    await this.recordActivity({ userId: params.userId, xpEarned, minutesSpent: 5, timezone: params.timezone });
    await this.checkAndUnlockTest(params.userId);

    return { xpEarned };
  }

  // ── Level test / level up ──

  async checkAndUnlockTest(userId: string): Promise<boolean> {
    const [user, progress] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { currentLevel: true } }),
      this.prisma.levelProgress.findUnique({ where: { userId } }),
    ]);

    if (user === null || progress === null) {
      return false;
    }

    const { readinessPercent } = this.computeReadiness(progress, user.currentLevel);

    if (readinessPercent >= 100 && !progress.isReadyForTest) {
      await this.prisma.levelProgress.update({
        where: { userId },
        data: { isReadyForTest: true, testUnlockedAt: new Date() },
      });
      this.logger.log({ event: 'LEVEL_TEST_UNLOCKED', userId, level: user.currentLevel });
      return true;
    }

    return false;
  }

  /**
   * SECURITY FIX: POST /progress/level-up promoted ANY authenticated user with no checks.
   * Now it needs the unlocked level test and consumes the unlock atomically (a concurrent second call cannot promote twice).
   * TODO: when TestModule exists make this internal and call it only after a PASSED test attempt.
   */
  async levelUp(userId: string): Promise<{ newLevel: Level } | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { currentLevel: true } });
    if (user === null) {
      throw new NotFoundException('User not found');
    }

    const nextLevel = getNextLevel(user.currentLevel);
    if (nextLevel === null) {
      return null;
    }

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.levelProgress.updateMany({
        where: { userId, isReadyForTest: true },
        data: { ...buildInitialProgress(nextLevel), isReadyForTest: false, testUnlockedAt: null },
      });

      if (claimed.count === 0) {
        throw new ForbiddenException('Level test is not unlocked yet');
      }

      await tx.user.update({ where: { id: userId }, data: { currentLevel: nextLevel } });
    });

    this.logger.log({ event: 'LEVEL_UP', userId, from: user.currentLevel, to: nextLevel });
    return { newLevel: nextLevel };
  }

  // ── Readiness ──

  private computeReadiness(progress: LevelProgress, level: Level) {
    const req = LEVEL_REQUIREMENTS[level];
    const skillBreakdown: Record<string, SkillBreakdown> = {};

    for (const key of SKILL_KEYS) {
      const stats = statsOf(progress[key] as ProgressStatsShape | null);
      const { required, accuracyMin } = req[key];
      const sms = computeSkillSMS(stats.completed, required, stats.accuracy, accuracyMin);
      skillBreakdown[key] = buildEntry(sms, stats.completed, required, stats.accuracy, accuracyMin);
    }

    const vocab = progress.vocabulary as VocabularyStatsShape;
    const vocabSms =
      req.vocabulary.required > 0 ? Math.min(100, Math.round((vocab.learned / req.vocabulary.required) * 100)) : 100;
    skillBreakdown['vocabulary'] = buildEntry(vocabSms, vocab.learned, req.vocabulary.required, 100, 0);

    const writing = progress.writing as WritingStatsShape;
    const writingSms = computeWritingSMS(writing.completed, req.writing.required, writing.avgScore, req.writing.avgScoreMin);
    skillBreakdown['writing'] = buildEntry(writingSms, writing.completed, req.writing.required, writing.avgScore, req.writing.avgScoreMin);

    const entries = Object.entries(skillBreakdown);
    const avgSMS = entries.reduce((sum, [, e]) => sum + e.sms, 0) / entries.length;
    const hasWeakness = entries.some(([, e]) => e.isBottleneck);
    const readinessPercent = hasWeakness ? Math.min(WEAKNESS_GATE_CAP, Math.round(avgSMS)) : Math.round(avgSMS);

    const weakestSkill = entries.reduce(
      (weakest, [key, e]) => (e.sms < weakest[1] ? ([key, e.sms] as [string, number]) : weakest),
      ['grammar', 101] as [string, number],
    )[0];

    return { readinessPercent, skillBreakdown, weakestSkill };
  }

  private buildNextMilestone(skillBreakdown: Record<string, SkillBreakdown>, weakestSkill: string): string {
    const skill = skillBreakdown[weakestSkill];
    if (skill === undefined) {
      return 'Keep practicing!';
    }

    const label = SKILL_LABELS[weakestSkill] ?? weakestSkill;

    if (skill.completed > 0 && skill.accuracyGap > 5) {
      return `Improve your ${weakestSkill} accuracy by ${Math.round(skill.accuracyGap)}% (currently ${Math.round(skill.accuracy)}%, need ${Math.round(skill.accuracyMin)}%).`;
    }
    if (skill.remainingCount > 0) {
      return `Complete ${skill.remainingCount} more ${label} to unlock the level test.`;
    }
    return `Almost there! Keep your ${weakestSkill} accuracy above ${Math.round(skill.accuracyMin)}%.`;
  }

  // ── Helpers ──

  private async calculateStreak(
    userId: string,
    today: string,
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
  ): Promise<number> {
    const activities = await tx.dailyActivity.findMany({
      where: { userId, date: { gte: this.cutoffDateString(365) } },
      select: { date: true },
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