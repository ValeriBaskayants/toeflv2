export interface ProgressStats {
  required: number;
  completed: number;
  accuracy: number;
}

export interface VocabularyStats {
  required: number;
  learned: number;
}

export interface WritingStats {
  required: number;
  completed: number;
  avgScore: number;
}

export interface LevelProgressData {
  id: string;
  userId: string;
  grammar: ProgressStats;
  vocabulary: VocabularyStats;
  speaking: ProgressStats;
  scramble: ProgressStats;
  reading: ProgressStats;
  writing: WritingStats;
  listening: ProgressStats;
  quiz: ProgressStats;
  isReadyForTest: boolean;
  testUnlockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyActivity {
  id: string;
  userId: string;
  date: string;
  xpEarned: number;
  sessionsCount: number;
  minutesSpent: number;
}

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

export interface DashboardData {
  currentLevel: string;
  totalXp: number;
  streak: number;
  streakMultiplier: number;
  progress: LevelProgressData;
  recentActivity: DailyActivity[];
  readinessPercent: number;
  skillBreakdown: Record<string, SkillBreakdown>;
  weakestSkill: string;
  nextMilestone: string;
  testUnlocked: boolean;
  moduleStats: {
    scramble: ModuleStat;
    speaking: ModuleStat;
  };
}

export interface LevelUpResult {
  newLevel: string;
}