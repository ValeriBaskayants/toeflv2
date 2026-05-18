import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Level, LevelProgress, DailyActivity } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  LEVEL_REQUIREMENTS,
  LEVEL_DISPLAY,
  buildInitialProgress,
  getNextLevel,
} from '../../constants/level-requirements';

// ─── Локальные константы для расчета прогресса ────────────────────────────
const WEAKNESS_GATE_THRESHOLD = 70;
const WEAKNESS_GATE_CAP = 80;
const ACTIVITY_DAYS = 30;

// ─── Public interfaces ─────────────────────────────────────────────────────

export interface SkillBreakdown {
  sms:            number;
  completed:      number;
  required:       number;
  accuracy:       number; // current EMA accuracy (0-100)
  accuracyMin:    number; // minimum required accuracy (0-100)
  remainingCount: number;
  accuracyGap:    number;
}

export interface DashboardResponse {
  currentLevel:     string;
  totalXp:          number;
  streak:           number;
  progress:         LevelProgress;
  recentActivity:   DailyActivity[];
  readinessPercent: number;
  skillBreakdown:   Record<string, SkillBreakdown>;
  weakestSkill:     string;
  nextMilestone:    string;
  testUnlocked:     boolean;
}

export type SkillKey = 'grammar' | 'reading' | 'listening' | 'quiz';

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

    const readinessData = this.computeReadiness(progress, user.currentLevel);

    return {
      currentLevel:     LEVEL_DISPLAY[user.currentLevel],
      totalXp:          user.totalXp,
      streak:           user.streak,
      progress,
      recentActivity,
      readinessPercent: readinessData.readinessPercent,
      skillBreakdown:   readinessData.skillBreakdown,
      weakestSkill:     readinessData.weakestSkill,
      nextMilestone:    this.buildNextMilestone(readinessData.skillBreakdown, readinessData.weakestSkill),
      testUnlocked:     progress.isReadyForTest,
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
    userId:    string;
    skill:     SkillKey;
    accuracy:  number;
    xpEarned:  number;
    timezone?: string;
  }): Promise<void> {
    const progress = await this.prisma.levelProgress.findUnique({
      where: { userId: params.userId },
    });

    if (progress === null) {
      throw new NotFoundException('Level progress not found');
    }

    const current = progress[params.skill] as { completed: number; accuracy: number };
    const newCompleted = current.completed + 1;
    
    const newAccuracy = emaAccuracy(
      current.completed,
      current.accuracy,
      params.accuracy,
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

    const readinessData = this.computeReadiness(progress, user.currentLevel);

    if (readinessData.readinessPercent >= 100 && !progress.isReadyForTest) {
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

  private computeReadiness(progress: LevelProgress, level: Level): {
    readinessPercent: number;
    skillBreakdown: Record<string, SkillBreakdown>;
    weakestSkill: string;
  } {
    const req = LEVEL_REQUIREMENTS[level];

    type ProgressStatsShape   = { completed: number; accuracy: number };
    type VocabularyStatsShape = { required:  number; learned:  number };
    type WritingStatsShape    = { completed: number; avgScore: number; required: number };

    const grammarStats   = progress.grammar   as ProgressStatsShape;
    const readingStats   = progress.reading   as ProgressStatsShape;
    const listeningStats = progress.listening as ProgressStatsShape;
    const quizStats      = progress.quiz      as ProgressStatsShape;
    const vocabStats     = progress.vocabulary as VocabularyStatsShape;
    const writingStats   = progress.writing   as WritingStatsShape;

    const grammarSMS = computeSkillSMS(grammarStats.completed, req.grammar.required, grammarStats.accuracy, req.grammar.accuracyMin);
    const readingSMS = computeSkillSMS(readingStats.completed, req.reading.required, readingStats.accuracy, req.reading.accuracyMin);
    const listeningSMS = computeSkillSMS(listeningStats.completed, req.listening.required, listeningStats.accuracy, req.listening.accuracyMin);
    const quizSMS = computeSkillSMS(quizStats.completed, req.quiz.required, quizStats.accuracy, req.quiz.accuracyMin);
    
    const vocabSMS = req.vocabulary.required > 0
      ? Math.min(100, Math.round((vocabStats.learned / req.vocabulary.required) * 100))
      : 100;
      
    const writingSMS = computeWritingSMS(writingStats.completed, req.writing.required, writingStats.avgScore, req.writing.avgScoreMin);

    const scores: Record<string, number> = {
      grammar:    grammarSMS,
      vocabulary: vocabSMS,
      reading:    readingSMS,
      writing:    writingSMS,
      listening:  listeningSMS,
      quiz:       quizSMS,
    };

    const skillBreakdown: Record<string, SkillBreakdown> = {
      grammar: {
        sms:            grammarSMS,
        completed:      grammarStats.completed,
        required:       req.grammar.required,
        accuracy:       grammarStats.accuracy,
        accuracyMin:    req.grammar.accuracyMin,
        remainingCount: Math.max(0, req.grammar.required - grammarStats.completed),
        accuracyGap:    Math.max(0, req.grammar.accuracyMin - grammarStats.accuracy),
      },
      vocabulary: {
        sms:            vocabSMS,
        completed:      vocabStats.learned,
        required:       req.vocabulary.required,
        accuracy:       100,
        accuracyMin:    0,
        remainingCount: Math.max(0, req.vocabulary.required - vocabStats.learned),
        accuracyGap:    0,
      },
      reading: {
        sms:            readingSMS,
        completed:      readingStats.completed,
        required:       req.reading.required,
        accuracy:       readingStats.accuracy,
        accuracyMin:    req.reading.accuracyMin,
        remainingCount: Math.max(0, req.reading.required - readingStats.completed),
        accuracyGap:    Math.max(0, req.reading.accuracyMin - readingStats.accuracy),
      },
      writing: {
        sms:            writingSMS,
        completed:      writingStats.completed,
        required:       req.writing.required,
        accuracy:       writingStats.avgScore,
        accuracyMin:    req.writing.avgScoreMin,
        remainingCount: Math.max(0, req.writing.required - writingStats.completed),
        accuracyGap:    Math.max(0, req.writing.avgScoreMin - writingStats.avgScore),
      },
      listening: {
        sms:            listeningSMS,
        completed:      listeningStats.completed,
        required:       req.listening.required,
        accuracy:       listeningStats.accuracy,
        accuracyMin:    req.listening.accuracyMin,
        remainingCount: Math.max(0, req.listening.required - listeningStats.completed),
        accuracyGap:    Math.max(0, req.listening.accuracyMin - listeningStats.accuracy),
      },
      quiz: {
        sms:            quizSMS,
        completed:      quizStats.completed,
        required:       req.quiz.required,
        accuracy:       quizStats.accuracy,
        accuracyMin:    req.quiz.accuracyMin,
        remainingCount: Math.max(0, req.quiz.required - quizStats.completed),
        accuracyGap:    Math.max(0, req.quiz.accuracyMin - quizStats.accuracy),
      },
    };

    const smsList = Object.values(scores);
    const avgSMS  = smsList.reduce((s, v) => s + v, 0) / smsList.length;

    const hasWeakness = smsList.some((sms) => sms < WEAKNESS_GATE_THRESHOLD);
    const readinessPercent = hasWeakness
      ? Math.min(WEAKNESS_GATE_CAP, Math.round(avgSMS))
      : Math.round(avgSMS);

    const weakestSkill = Object.entries(scores).reduce(
      (a, [k, v]) => (v < a[1] ? [k, v] as [string, number] : a),
      ['grammar', 100] as [string, number],
    )[0];

    return { readinessPercent, skillBreakdown, weakestSkill };
  }

  private buildNextMilestone(
    skillBreakdown: Record<string, SkillBreakdown>,
    weakestSkill:   string,
  ): string {
    const skill = skillBreakdown[weakestSkill];
    if (skill === undefined) { return 'Keep practicing!'; }

    const skillLabel: Record<string, string> = {
      grammar:    'grammar exercises',
      vocabulary: 'vocabulary words',
      reading:    'reading materials',
      writing:    'writing submissions',
      listening:  'listening sessions',
      quiz:       'quiz questions',
    };

    const label = skillLabel[weakestSkill] ?? weakestSkill;

    if (skill.accuracyGap > 0) {
      return `Improve your ${weakestSkill} accuracy by ${Math.round(skill.accuracyGap)}% to unlock the test.`;
    }

    return `Complete ${skill.remainingCount} more ${label}.`;
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

// ─── Вспомогательные функции (EMA и SMS) ───────────────────────────────────

function emaAccuracy(completed: number, currentAccuracy: number, newAccuracy: number): number {
  if (completed === 0) return newAccuracy;
  const alpha = 0.2; // Вес недавних ответов
  return Math.round(currentAccuracy * (1 - alpha) + newAccuracy * alpha);
}

function computeSkillSMS(completed: number, required: number, accuracy: number, accuracyMin: number): number {
  if (required === 0) return 100;
  const quantityPct = Math.min(100, (completed / required) * 100);
  const accuracyRatio = accuracyMin > 0 ? Math.min(1, accuracy / accuracyMin) : 1;
  return Math.round(quantityPct * Math.max(0.4, accuracyRatio));
}

function computeWritingSMS(completed: number, required: number, avgScore: number, avgScoreMin: number): number {
  if (required === 0) return 100;
  const qPct = Math.min(100, (completed / required) * 100);
  const scoreRatio = avgScoreMin > 0 ? Math.min(1, avgScore / avgScoreMin) : 1;
  return Math.round(qPct * Math.max(0.4, scoreRatio));
}