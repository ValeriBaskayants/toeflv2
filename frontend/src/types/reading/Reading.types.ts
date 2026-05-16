import { type ID, Level, QuestionType, type ISODateString } from '../globalTypes';

export interface VocabularyEmbedded {
    word: string;
    translation: string;
    contextSentence?: string;
}

export interface AnswerPayload {
    questionIdx: number;
    selectedOptionIdx: number;
}

export interface QuestionOption {
    text: string;
    isCorrect: boolean;
    questionIdx: number;
    correctIdx: number;
}

export interface Question {
    type: QuestionType;
    text: string;
    explanation?: string;
    options: QuestionOption[];
}

export interface SubmitReadingPayload {
    materialId: string;
    answers: AnswerPayload[];
}

export interface ReadingMaterial {
    id: ID;
    title: string;
    slug: string;
    description?: string;

    content: string;
    contentBlocks?: unknown;

    level: Level;
    topic: string;
    tags: string[];

    wordCount: number;
    estimatedMinutes: number;

    coverImageUrl?: string;

    questions: Question[];
    vocabulary: VocabularyEmbedded[];

    createdAt: ISODateString;
    updatedAt: ISODateString;
}


export interface ReadingListItem {
    id: ID;
    title: string;
    slug: string;
    description?: string;
    level: Level;
    topic: string;
    tags: string[];
    wordCount: number;
    estimatedMinutes: number;
    coverImageUrl?: string;
    createdAt: ISODateString;
}

export interface QuestionResult {
    questionIdx: number;
    isCorrect: boolean;
    correctIdx: number;
    explanation?: string;
}

export interface SubmitReadingResult {
    results: QuestionResult[];
    accuracy: number;
    xpEarned: number;
}