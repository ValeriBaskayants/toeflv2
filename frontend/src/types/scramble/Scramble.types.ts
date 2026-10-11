import type { Level } from '../globalTypes';

export type ScrambleMode = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
export type ScrambleBlockKind = 'PRACTICE_SET' | 'EXAM';

export type GrammarRole =
  | 'SUBJECT' | 'VERB' | 'OBJECT' | 'ADJECTIVE' | 'ADVERB'
  | 'PREPOSITION' | 'CONJUNCTION' | 'DETERMINER' | 'COMPLEMENT' | 'OTHER';

export interface ScrambleBlockWord {
  id: string;
  word: string;
  isDistractor: boolean;
  role?: GrammarRole;
}

export interface ScrambleBlockBlank {
  position: number;
  hint?: GrammarRole;
  maxLength: number;
}

export interface ScrambleBlockItem {
  exerciseId: string;
  index: number;
  totalItems: number;
  prompt: string;
  topic: string;
  words: { tiles: ScrambleBlockWord[]; blanks: ScrambleBlockBlank[] };
  timeLimitSec: number;
}

// --- guided linear flow (A1–A2+): один пункт за раз, мгновенный фидбек ---

export interface ScrambleLinearStart {
  blockId: string;
  kind: 'PRACTICE_SET';
  freeNavigation: false;
  startedAt: string;
  totalItems: number;
  item: ScrambleBlockItem;
}

export interface ScrambleLinearSubmitResult {
  isCorrect: boolean;
  correctSentence: string;
  itemsCompleted: number;
  totalItems: number;
  blockCompleted: boolean;
  nextItem: ScrambleBlockItem | null;
  correctCount?: number;
  finalScorePercent?: number;
  xpEarned?: number;
}

// --- free-navigation flow (B1+ practice-set и EXAM): все пункты сразу, единый таймер ---

export interface ScrambleDraftAnswer {
  exerciseId: string;
  wordOrder: string[];
  filledBlanks: Array<{ position: number; text: string }>;
  usedHint: boolean;
  updatedAt: string;
}

export interface ScrambleFreeNavStart {
  blockId: string;
  kind: ScrambleBlockKind;
  freeNavigation: true;
  startedAt: string;
  totalTimeBudgetSec: number;
  items: ScrambleBlockItem[];
}

export interface ScrambleFreeNavItemsResponse {
  blockId: string;
  kind: ScrambleBlockKind;
  startedAt: string;
  totalTimeBudgetSec: number;
  items: ScrambleBlockItem[];
  draftAnswers: ScrambleDraftAnswer[];
}

export type ScrambleBlockStart = ScrambleLinearStart | ScrambleFreeNavStart;

export interface ScrambleFinishResult {
  blockCompleted: true;
  timedOut: boolean;
  correctCount: number;
  finalScorePercent: number;
  xpEarned: number;
  totalItems: number;
}

export interface ScrambleBlockReviewItem {
  prompt: string;
  correctSentence: string;
  topic: string;
  isCorrect: boolean;
  timeSpentSec: number;
  usedHint: boolean;
}

export interface ScrambleBlockReview {
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  correctCount: number | null;
  finalScorePercent: number | null;
  xpEarned: number | null;
  items: ScrambleBlockReviewItem[];
}

export interface StartPracticeSetParams {
  level: Level;
  count: number;
}