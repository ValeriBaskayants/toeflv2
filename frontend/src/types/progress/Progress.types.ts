
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

export interface DashboardData {
  currentLevel: string;
  totalXp: number;
  streak: number;
  progress: LevelProgressData;
  recentActivity: DailyActivity[];
  readinessPercent: number;
}

export interface LevelUpResult {
  newLevel: string;
}