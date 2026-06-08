import {
  type ID,
  type ISODateString,
  Level,
  MistakeSource,
  ErrorCategory,
  MasteryStatus,
} from '../globalTypes';

// ─── Core types ───────────────────────────────────────────────────────────────

export interface MistakeAttempt {
  id:            ID;
  userAnswer:    string;
  correctAnswer: string;
  isCorrect:     boolean;
  createdAt:     ISODateString;
}

export interface UserMistake {
  id:             ID;
  targetId:       string;
  source:         MistakeSource;
  grammarRuleId?: string;
  topic:          string;
  category:       ErrorCategory;
  level:          Level;
  status:         MasteryStatus;
  nextReview?:    ISODateString;
  easeFactor:     number;
  wrongCount:     number;
  correctCount:   number;
  createdAt:      ISODateString;
  updatedAt:      ISODateString;
  attempts:       MistakeAttempt[];
}

export interface WeakSpot {
  topic:               string;
  category:            ErrorCategory;
  level:               Level;
  errorWeight:         number;
  uniqueMistakesCount: number;
}

// ─── Derived helpers ──────────────────────────────────────────────────────────

export function mistakeAccuracy(m: UserMistake): number {
  const total = m.wrongCount + m.correctCount;
  return total > 0 ? Math.round((m.correctCount / total) * 100) : 0;
}

export function isDueForReview(m: UserMistake): boolean {
  if (!m.nextReview) return false;
  return new Date(m.nextReview) <= new Date();
}