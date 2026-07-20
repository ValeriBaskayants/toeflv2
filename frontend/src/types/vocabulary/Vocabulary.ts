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



export interface MCQOption {
  id: string;
  text: string;
}

export interface MCQCard {
  cardId: string;
  type: 'MCQ';
  word: string;
  pronunciation: string;
  level: Level;
  partOfSpeech: PartOfSpeech;
  imageUrl?: string;
  options: MCQOption[];
}

export interface ClozeCard {
  cardId: string;
  type: 'CLOZE';
  before: string;
  after: string;
  answer: string;
  synonyms: string[];
  level: Level;
  partOfSpeech: PartOfSpeech;
  wordLength: number;
}

export type VocabCard = MCQCard | ClozeCard;

export interface SubmitVocabAnswerPayload {
  wordId: string;
  type: 'MCQ' | 'CLOZE';
  selectedId?: string;
  answerText?: string;
  hintsUsed?: number;
  timezone?: string;
}

export interface SubmitAnswerResult {
  isCorrect: boolean;
  correctAnswer: string;
  definition: string;
  definitionRu?: string;
  status: WordLearningStatus;
  nextReviewDate: ISODateString;
  interval: number;
  repetitions: number;
  easinessFactor: number;
  justMastered: boolean;
}



export interface VocabUserProgress {
  total: number;
  learned: number;
  mastered: number;
  dueToday: number;
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