import type { Level } from '../globalTypes';

export type SpeakingDifficulty = 'SHORT' | 'MEDIUM' | 'LONG';

export interface SpeakingRepeatItem {
  id: string;
  text: string;
  difficulty: SpeakingDifficulty;
  orderIndex: number;
  imageUrl: string | null;
}

export interface SpeakingRepeatSetSummary {
  id: string;
  scenario: string;
  level: Level;
  voiceId: string;
  items: SpeakingRepeatItem[];
}

export interface SpeakingStartSessionResponse {
  session: {
    id: string;
    startedAt: string;
  };
  items: SpeakingRepeatItem[];
  voiceId: string;
}

export interface SpeakingItemAudioResponse {
  audioBase64: string;
  referenceText: string;
  difficulty: SpeakingDifficulty;
}

export interface SpeakingWordScore {
  word: string;
  accuracyScore: number;
  errorType: string;
}

export interface SpeakingSubmitAttemptResponse {
  itemScore: number;
  recognizedText: string;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  wordScores: SpeakingWordScore[];
}

export interface SpeakingItemResult {
  itemId: string;
  referenceText: string;
  recognizedText: string;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number | null;
  itemScore: number;
  wordScores: SpeakingWordScore[];
  userAudioBase64: string;
  userAudioMimeType: string;
  attemptedAt: string;
}

export interface SpeakingSessionReview {
  id: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  results: SpeakingItemResult[];
  taskScore: number | null;
  finalScore: number | null;
  xpEarned: number | null;
  startedAt: string;
  completedAt: string | null;
}