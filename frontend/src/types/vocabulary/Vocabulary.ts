import type {
  ID,
  ISODateString,
  Level,
  PartOfSpeech,
  WordLearningStatus,
} from '@/types/globalTypes';

export interface WordForms {
  base?: string;
  past?: string;
  pastParticiple?: string;
  thirdPerson?: string;
  presentParticiple?: string;
}

export interface VocabularyWord {
  id: ID;
  word: string;
  level: Level;
  type: PartOfSpeech;
  pronunciation: string;
  definition: string;
  definitionRu: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  imageUrl?: string;
  forms?: WordForms;
  isIrregularVerb: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface UserVocabularyProgress {
  id: ID;
  userId: string;
  wordId: string;
  easinessFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: ISODateString;
  status: WordLearningStatus;
  lastReviewedAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Flashcard {
  word: VocabularyWord;
  progress: UserVocabularyProgress | null;
}

export interface VocabUserProgress {
  total: number;
  learned: number;
  mastered: number;
  dueToday: number;
}

export interface ReviewResult {
  status: WordLearningStatus;
  nextReviewDate: ISODateString;
  interval: number;
  repetitions: number;
  justMastered: boolean;
}

export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;

export interface ReviewWordPayload {
  wordId: string;
  quality: SM2Quality;
}

export interface GetVocabularyParams {
  level?: Level;
  type?: PartOfSpeech;
  search?: string;
  limit?: number;
}

export interface GetFlashcardsParams {
  level?: Level;
  type?: PartOfSpeech;
  limit?: number;
}
