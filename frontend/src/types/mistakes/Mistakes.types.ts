
import {
  type ID,
  type ISODateString,
  Level,
  MistakeSource,
  ErrorCategory,
  MasteryStatus,
} from '../globalTypes';



export interface MistakeAttempt {
  id: ID;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  createdAt: ISODateString;
}

export interface UserMistake {
  id: ID;
  targetId: string;
  source: MistakeSource;
  grammarRuleId?: string;
  topic: string;
  category: ErrorCategory;
  level: Level;
  status: MasteryStatus;
  nextReview?: ISODateString | null;
  easeFactor: number;
  wrongCount: number;
  correctCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  attempts: MistakeAttempt[];
  
  accuracy: number;
  dueForReview: boolean;
  adjustedWeight: number;
}

export interface WeakSpot {
  topic: string;
  category: ErrorCategory;
  level: Level;
  wrongCount: number;
  correctCount: number;
  accuracy: number;
  adjustedWeight: number;        
  uniqueMistakesCount: number;
  status: MasteryStatus;
  dueForReview: boolean;
}

export interface HeatmapCell {
  topic: string;
  level: Level;
  weight: number;   
  count: number;    
}

export interface DueMistake {
  id: ID;
  topic: string;
  category: ErrorCategory;
  level: Level;
  source: MistakeSource;
  wrongCount: number;
  correctCount: number;
  accuracy: number;
  nextReview: ISODateString | null;
  recentAttempt: { userAnswer: string; correctAnswer: string } | null;
}

export interface DueCount {
  count: number;
}

export interface MasteredResult {
  status: MasteryStatus;
}



export function mistakeAccuracy(m: UserMistake): number {
  if (typeof m.accuracy === 'number') return m.accuracy;
  const total = m.wrongCount + m.correctCount;
  return total > 0 ? Math.round((m.correctCount / total) * 100) : 0;
}

export function isDueForReview(m: UserMistake): boolean {
  if (typeof m.dueForReview === 'boolean') return m.dueForReview;
  if (!m.nextReview) return false;
  return new Date(m.nextReview) <= new Date();
}