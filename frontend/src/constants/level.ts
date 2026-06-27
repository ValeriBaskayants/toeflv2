import  { Difficulty, Level } from "@/types/globalTypes";

export const LEVEL_COLOR: Record<string, string> = {
  A1: '#22c55e',
  A1_PLUS: '#16a34a',
  A2: '#14b8a6',
  A2_PLUS: '#0d9488',
  B1: '#3b82f6',
  B1_PLUS: '#2563eb',
  B2: '#8b5cf6',
  B2_PLUS: '#7c3aed',
  C1: '#f59e0b',
  C2: '#ef4444',
};

export const LEVEL_DISPLAY: Record<string, string> = {
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
};

export function getLevelColor(level: string): string {
  return LEVEL_COLOR[level] ?? '#6366f1';
}



export const LEVEL_VALUES: Array<Level | null> = [
  Level.A1, Level.A1_PLUS, Level.A2, Level.A2_PLUS,
  Level.B1, Level.B1_PLUS, Level.B2, Level.B2_PLUS, Level.C1, Level.C2,
];

export const DIFFICULTY_VALUES: Array<Difficulty | null> = [null, Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];





export const DIFFICULTY_COLOR: Record<string, string> = {
  EASY: '#22c55e', MEDIUM: '#f59e0b', HARD: '#ef4444',
};

export const STATUS_DOT: Record<string, string> = {
  not_started: 'var(--text-3)',
  in_progress: '#3b82f6',
  mastered:    '#22c55e',
};