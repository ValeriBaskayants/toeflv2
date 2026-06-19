import type { Level } from '@prisma/client';

export const LEVEL_DISPLAY: Readonly<Record<Level, string>> = {
  A1: 'A1',
  A1_PLUS: 'A1+',
  A2: 'A2',
  A2_PLUS: 'A2+',
  B1: 'B1',
  B1_PLUS: 'B1+',
  B2: 'B2',
  B2_PLUS: 'B2+',
  C1: 'C1',
  C2: 'C2',
} as const;

export const LEVEL_ORDER: Level[] = [
  'A1',
  'A1_PLUS',
  'A2',
  'A2_PLUS',
  'B1',
  'B1_PLUS',
  'B2',
  'B2_PLUS',
  'C1',
  'C2',
];

export const ACCURACY_EMA_ALPHA = 0.15;

export const SMS_QUALITY_FLOOR = 0.3;
export const SMS_QUALITY_THRESHOLD = 1.0;

export const WEAKNESS_GATE_THRESHOLD = 50;
export const WEAKNESS_GATE_CAP = 80;

export const STREAK_MULTIPLIERS: Readonly<Record<string, number>> = {
  '0': 1.0,
  '3': 1.1,
  '7': 1.25,
  '14': 1.5,
  '30': 1.75,
  '60': 2.0,
} as const;

export function getStreakMultiplier(streak: number): number {
  const thresholds = [60, 30, 14, 7, 3, 0];
  for (const t of thresholds) {
    const key = String(t);
    if (streak >= t && STREAK_MULTIPLIERS[key] !== undefined) {
      return STREAK_MULTIPLIERS[key] as number;
    }
  }
  return 1.0;
}

export const XP_BASE = {
  GRAMMAR_CORRECT: 8,
  GRAMMAR_WRONG: 1,
  READING_COMPLETED: 25,
  VOCABULARY_MASTERED: 15,
  WRITING_BASE: 20,
  WRITING_SCORE_MULT: 0.5,
  LISTENING_EASY: 20,
  LISTENING_MEDIUM: 35,
  LISTENING_HARD: 55,
  QUIZ_CORRECT: 6,
  QUIZ_WRONG: 0,
} as const;

export const DIFFICULTY_XP_MULTIPLIER = {
  EASY: 1.0,
  MEDIUM: 1.3,
  HARD: 1.7,
} as const;

export const ACCURACY_BONUS_THRESHOLD = 90;
export const ACCURACY_BONUS_MULTIPLIER = 1.1;

export const MIN_SESSION_ACCURACY_FOR_COMPLETION = 40;

export interface LevelRequirement {
  grammar: { required: number; accuracyMin: number };
  vocabulary: { required: number };
  reading: { required: number; accuracyMin: number };
  writing: { required: number; avgScoreMin: number };
  listening: { required: number; accuracyMin: number };
  quiz: { required: number; accuracyMin: number };
}

export const LEVEL_REQUIREMENTS: Readonly<Record<Level, LevelRequirement>> = {
  A1: {
    grammar: { required: 40, accuracyMin: 60 },
    vocabulary: { required: 120 },
    reading: { required: 5, accuracyMin: 60 },
    writing: { required: 2, avgScoreMin: 55 },
    listening: { required: 4, accuracyMin: 55 },
    quiz: { required: 20, accuracyMin: 60 },
  },
  A1_PLUS: {
    grammar: { required: 70, accuracyMin: 63 },
    vocabulary: { required: 220 },
    reading: { required: 9, accuracyMin: 63 },
    writing: { required: 4, avgScoreMin: 58 },
    listening: { required: 7, accuracyMin: 58 },
    quiz: { required: 35, accuracyMin: 63 },
  },
  A2: {
    grammar: { required: 120, accuracyMin: 65 },
    vocabulary: { required: 380 },
    reading: { required: 15, accuracyMin: 65 },
    writing: { required: 7, avgScoreMin: 60 },
    listening: { required: 12, accuracyMin: 60 },
    quiz: { required: 55, accuracyMin: 67 },
  },
  A2_PLUS: {
    grammar: { required: 180, accuracyMin: 67 },
    vocabulary: { required: 580 },
    reading: { required: 24, accuracyMin: 67 },
    writing: { required: 10, avgScoreMin: 62 },
    listening: { required: 18, accuracyMin: 62 },
    quiz: { required: 80, accuracyMin: 70 },
  },
  B1: {
    grammar: { required: 250, accuracyMin: 70 },
    vocabulary: { required: 850 },
    reading: { required: 35, accuracyMin: 70 },
    writing: { required: 15, avgScoreMin: 65 },
    listening: { required: 28, accuracyMin: 65 },
    quiz: { required: 115, accuracyMin: 73 },
  },
  B1_PLUS: {
    grammar: { required: 340, accuracyMin: 73 },
    vocabulary: { required: 1200 },
    reading: { required: 48, accuracyMin: 73 },
    writing: { required: 21, avgScoreMin: 68 },
    listening: { required: 40, accuracyMin: 68 },
    quiz: { required: 155, accuracyMin: 76 },
  },
  B2: {
    grammar: { required: 460, accuracyMin: 76 },
    vocabulary: { required: 1700 },
    reading: { required: 65, accuracyMin: 76 },
    writing: { required: 28, avgScoreMin: 72 },
    listening: { required: 55, accuracyMin: 72 },
    quiz: { required: 210, accuracyMin: 79 },
  },
  B2_PLUS: {
    grammar: { required: 580, accuracyMin: 79 },
    vocabulary: { required: 2300 },
    reading: { required: 88, accuracyMin: 79 },
    writing: { required: 38, avgScoreMin: 76 },
    listening: { required: 72, accuracyMin: 76 },
    quiz: { required: 270, accuracyMin: 82 },
  },
  C1: {
    grammar: { required: 750, accuracyMin: 82 },
    vocabulary: { required: 3200 },
    reading: { required: 120, accuracyMin: 82 },
    writing: { required: 55, avgScoreMin: 80 },
    listening: { required: 100, accuracyMin: 80 },
    quiz: { required: 360, accuracyMin: 85 },
  },
  C2: {
    grammar: { required: 0, accuracyMin: 0 },
    vocabulary: { required: 0 },
    reading: { required: 0, accuracyMin: 0 },
    writing: { required: 0, avgScoreMin: 0 },
    listening: { required: 0, accuracyMin: 0 },
    quiz: { required: 0, accuracyMin: 0 },
  },
} as const;

export function emaAccuracy(
  currentCompleted: number,
  historicalAccuracy: number,
  newAccuracy: number,
): number {
  if (currentCompleted === 0) {
    return newAccuracy;
  }
  const alpha = ACCURACY_EMA_ALPHA;
  return Math.round(alpha * newAccuracy + (1 - alpha) * historicalAccuracy);
}

export function computeSkillSMS(
  completed: number,
  required: number,
  accuracy: number,
  accuracyMin: number,
): number {
  if (required === 0) return 100;

  const quantityGate = Math.min(100, (completed / required) * 100);

  const qualityMultiplier =
    accuracyMin <= 0 ? 1.0 : Math.max(SMS_QUALITY_FLOOR, Math.min(1.0, accuracy / accuracyMin));

  return Math.round(quantityGate * qualityMultiplier);
}

export function computeWritingSMS(
  completed: number,
  required: number,
  avgScore: number,
  avgScoreMin: number,
): number {
  return computeSkillSMS(completed, required, avgScore, avgScoreMin);
}

export function computeXP(params: {
  base: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  streak: number;
  accuracy?: number;
}): number {
  const diffMult =
    params.difficulty !== undefined ? (DIFFICULTY_XP_MULTIPLIER[params.difficulty] ?? 1.0) : 1.0;

  const streakMult = getStreakMultiplier(params.streak);

  const accuracyBonus =
    params.accuracy !== undefined && params.accuracy >= ACCURACY_BONUS_THRESHOLD
      ? ACCURACY_BONUS_MULTIPLIER
      : 1.0;

  return Math.round(params.base * diffMult * streakMult * accuracyBonus);
}

export function isSessionCountable(accuracy: number): boolean {
  return accuracy >= MIN_SESSION_ACCURACY_FOR_COMPLETION;
}

export function getNextLevel(current: Level): Level | null {
  const idx = LEVEL_ORDER.indexOf(current);
  if (idx === -1 || idx === LEVEL_ORDER.length - 1) return null;
  return LEVEL_ORDER[idx + 1] ?? null;
}

export function buildInitialProgress(level: Level) {
  const req = LEVEL_REQUIREMENTS[level];
  return {
    grammar: { required: req.grammar.required, completed: 0, accuracy: 0 },
    vocabulary: { required: req.vocabulary.required, learned: 0 },
    reading: { required: req.reading.required, completed: 0, accuracy: 0 },
    writing: { required: req.writing.required, completed: 0, avgScore: 0 },
    listening: { required: req.listening.required, completed: 0, accuracy: 0 },
    quiz: { required: req.quiz.required, completed: 0, accuracy: 0 },
  };
}
