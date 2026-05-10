import {
    type ID,
    Level,
    ListeningType,
    ListeningMode,
    ListeningSessionStatus,
    type ISODateString,
} from '../globalTypes';

export interface ListeningSegment {
    index: number;
    text: string;
    startSec: number;
    endSec: number;
    speaker?: string;
}

export interface ListeningAnswerRecord {
    questionId: ID;
    selectedIndex: number;
    isCorrect: boolean;
    answeredAtSec?: number;
}

export interface ListeningNote {
    id: ID;
    text: string;
    anchorSec?: number;
    createdAt: ISODateString;
}

export interface ListeningQuestion {
    id: ID;
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;

    referenceStartSec?: number;
    referenceEndSec?: number;

    orderIndex: number;
}

export interface ListeningMaterial {
    id: ID;

    title: string;
    topic: string;
    level: Level;
    type: ListeningType;

    fullText: string;
    segments: ListeningSegment[];

    speakerRate: number;
    speakerLang: string;
    speakerPitch: number;

    allowedModes: ListeningMode[];

    questions: ListeningQuestion[];

    createdAt: ISODateString;
    updatedAt: ISODateString;
}

export interface ListeningSession {
    id: ID;

    userId: ID;
    materialId: ID;

    mode: ListeningMode;
    status: ListeningSessionStatus;

    playCount: number;
    maxAllowedPlays: number;

    notes: ListeningNote[];
    answers: ListeningAnswerRecord[];

    correctCount?: number;
    totalCount?: number;
    rawAccuracy?: number;
    finalScore?: number;
    xpEarned?: number;

    startedAt: ISODateString;
    completedAt?: ISODateString;
}