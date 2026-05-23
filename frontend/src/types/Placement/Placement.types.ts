export type PlacementStatus =
    | 'PENDING'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'SKIPPED'
    | 'REMIND_LATER';

export type Dimension = 'GRAMMAR' | 'VOCABULARY' | 'READING' | 'LISTENING';


export interface PlacementStatusResponse {
    status: PlacementStatus;
    showBanner: boolean;
    detectedLevel: string | null;
    confidenceScore: number | null;
}


export interface PublicQuestion {
    index: number;
    dimension: Dimension;
    text: string;
    options: string[];
}


export interface StartTestResponse {
    test: unknown;
    nextQuestion: PublicQuestion;
    maxQuestions: number;
}


export interface AnswerResponseContinue {
    converged: false;
    isCorrect: boolean;
    questionsAnswered: number;
    nextQuestion: PublicQuestion;
}

export interface AnswerResponseComplete {
    converged: true;
    detectedLevel: string;
    confidenceScore: number;
    questionsAnswered: number;
    theta: Record<string, number>;
    standardError: Record<string, number>;
}

export type AnswerResponse = AnswerResponseContinue | AnswerResponseComplete;


export interface SkipResponse {
    skipped: boolean;
    assignedLevel: string;
}


export interface RemindLaterResponse {
    remindAfter: string;
}