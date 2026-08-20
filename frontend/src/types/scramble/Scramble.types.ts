import type { Level } from '../globalTypes';

export type ScrambleMode = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

export type GrammarRole =
  | 'SUBJECT'
  | 'VERB'
  | 'OBJECT'
  | 'ADJECTIVE'
  | 'ADVERB'
  | 'PREPOSITION'
  | 'CONJUNCTION'
  | 'DETERMINER'
  | 'COMPLEMENT'
  | 'OTHER';

export interface ScrambleWordOption {
  id: string;
  word: string;
  isDistractor: boolean;
  role?: GrammarRole;
}

export interface ScrambleExerciseSummary {
  id: string;
  sentence: string;
  level: Level;
  topic: string;
  allowedModes: ScrambleMode[];
  wordCount: number;
  distractorCount: number;
  timeLimitEasy: number;
  timeLimitMedium: number;
  timeLimitHard: number;
  timeLimitExpert: number;
  createdAt: string;
  userStatus: 'not_started' | 'in_progress' | 'completed';
  bestScore: number | null;
}

export interface ScrambleExerciseDetail {
  id: string;
  level: Level;
  topic: string;
  allowedModes: ScrambleMode[];
  wordCount: number;
  distractorCount: number;
  words: ScrambleWordOption[];
  openSession: { id: string; mode: ScrambleMode } | null;
  timeLimitSec: number;
}

export interface ScrambleSessionStart {
  id: string;
  mode: ScrambleMode;
  status: 'IN_PROGRESS';
  startedAt: string;
  timeLimitSec: number;
}

export interface ScrambleWordWithRole {
  id: string;
  word: string;
  role: GrammarRole;
  position: number;
}

export interface ScrambleSubmitResult {
  isCorrect: boolean;
  correctSentence: string;
  correctOrder: string[];
  wordsWithRoles: ScrambleWordWithRole[];
  finalScore: number;
  xpEarned: number;
  timeSpentSec: number;
  timeLimitSec: number;
  mode: ScrambleMode;
}