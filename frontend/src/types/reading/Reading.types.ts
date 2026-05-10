import { type ID, Level, QuestionType, type ISODateString } from '../globalTypes';

export interface VocabularyEmbedded {
    word: string;
    translation: string;
    contextSentence?: string;
}

export interface QuestionOption {
    text: string;
    isCorrect: boolean;
}

export interface Question {
    type: QuestionType;
    text: string;
    explanation?: string;
    options: QuestionOption[];
}

export interface ReadingMaterial {
    id: ID;
    title: string;
    slug: string;
    description?: string;

    content: string;
    contentBlocks?: unknown; // JSON

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