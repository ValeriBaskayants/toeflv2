import { type ID, Level, type ISODateString } from '../globalTypes';

export enum SpeakingDifficulty {
  SHORT = 'SHORT',
  MEDIUM = 'MEDIUM',
  LONG = 'LONG',
}

export enum SpeakingSessionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

export interface SpeakingSetListItem {
  id: ID;
  scenario: string;
  level: Level;
  imageUrl: string | null;
  itemCount: number;
  createdAt: ISODateString;
  userStatus: 'not_started' | 'in_progress' | 'completed';
  bestScore: number | null;
}

// Публичная форма item — намеренно БЕЗ text. Реальный текст предложения
// сервер не отдаёт нигде, кроме результата уже сданной попытки — иначе
// задача теряет смысл (см. review бэка).
export interface PublicSpeakingItem {
  id: ID;
  difficulty: SpeakingDifficulty;
  orderIndex: number;
  recordingWindowSec: number;
}

export interface SpeakingSetDetail {
  id: ID;
  scenario: string;
  level: Level;
  imageUrl: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  items: PublicSpeakingItem[];
}

export interface StartSpeakingSessionResponse {
  session: { id: ID; startedAt: ISODateString };
  scenario: string;
  voiceId: string;
  imageUrl: string | null;
  items: PublicSpeakingItem[];
}

export interface ItemAudioResponse {
  audioBase64: string;
  difficulty: SpeakingDifficulty;
  recordingWindowSec: number;
}

export interface SpeakingWordScore {
  word: string;
  accuracyScore: number;
  errorType: string;
}

export interface SubmitAttemptResponse {
  itemScore: number;
  recognizedText: string;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  repetitionAccuracy: number;
  wordScores: SpeakingWordScore[];
}

export interface SpeakingItemResult {
  itemId: ID;
  referenceText: string;
  recognizedText: string;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number | null;
  repetitionAccuracy: number;
  itemScore: number;
  wordScores: SpeakingWordScore[];
  userAudioBase64: string;
  userAudioMimeType: string;
  attemptedAt: string;
}

export interface SpeakingSessionReview {
  id: ID;
  userId: ID;
  setId: ID;
  status: SpeakingSessionStatus;
  results: SpeakingItemResult[];
  playedItemIds: string[];
  taskScore: number | null;
  finalScore: number | null;
  xpEarned: number | null;
  startedAt: ISODateString;
  completedAt: ISODateString | null;
}

export interface GetSpeakingSetsParams {
  level?: string | null;
  scenario?: string;
}