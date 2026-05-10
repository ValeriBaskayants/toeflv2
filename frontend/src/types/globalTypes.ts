export type ID = string;
export type ISODateString = string;

export enum Role {
    USER = 'USER',
    ADMIN = 'ADMIN',
}

export enum Level {
    A1 = 'A1',
    A1_PLUS = 'A1_PLUS',
    A2 = 'A2',
    A2_PLUS = 'A2_PLUS',
    B1 = 'B1',
    B1_PLUS = 'B1_PLUS',
    B2 = 'B2',
    B2_PLUS = 'B2_PLUS',
    C1 = 'C1',
    C2 = 'C2',
}

export enum Difficulty {
    EASY = 'EASY',
    MEDIUM = 'MEDIUM',
    HARD = 'HARD',
}

export enum BookmarkType {
    GRAMMAR_RULE = 'GRAMMAR_RULE',
    VOCABULARY = 'VOCABULARY',
    READING = 'READING',
    WRITING_PROMPT = 'WRITING_PROMPT',
}

export enum MistakeSource {
    QUIZ = 'QUIZ',
    WRITING = 'WRITING',
    READING = 'READING',
    LISTENING = 'LISTENING',
}

export enum ErrorCategory {
    GRAMMAR = 'GRAMMAR',
    VOCABULARY = 'VOCABULARY',
    SPELLING = 'SPELLING',
    LOGIC = 'LOGIC',
}

export enum MasteryStatus {
    LEARNING = 'LEARNING',
    REVIEWING = 'REVIEWING',
    MASTERED = 'MASTERED',
}

export enum ListeningType {
    LECTURE = 'LECTURE',
    CONVERSATION = 'CONVERSATION',
}

export enum ListeningMode {
    EASY = 'EASY',
    MEDIUM = 'MEDIUM',
    HARD = 'HARD',
}

export enum ListeningSessionStatus {
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    ABANDONED = 'ABANDONED',
}

export enum QuestionType {
    MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
    TRUE_FALSE = 'TRUE_FALSE',
    FILL_IN_THE_BLANK = 'FILL_IN_THE_BLANK',
}

export enum PartOfSpeech {
    NOUN = 'NOUN',
    VERB = 'VERB',
    ADJECTIVE = 'ADJECTIVE',
    ADVERB = 'ADVERB',
    PHRASE = 'PHRASE',
}

export enum WordLearningStatus {
    NEW = 'NEW',
    LEARNING = 'LEARNING',
    REVIEW = 'REVIEW',
    MASTERED = 'MASTERED',
}

export enum WritingType {
    SENTENCE = 'SENTENCE',
    PARAGRAPH = 'PARAGRAPH',
    ESSAY = 'ESSAY',
}

export enum SubmissionStatus {
    PENDING = 'PENDING',
    ANALYZED = 'ANALYZED',
    ERROR = 'ERROR',
}