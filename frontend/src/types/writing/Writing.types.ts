import { type ID, Level, WritingType, SubmissionStatus, type ISODateString } from '../globalTypes';

export interface WritingError {
  message: string;
  context: string;
  offset: number;
  length: number;
  replacements: string[];
}

export interface WritingAnalysis {
  overallScore: number;
  grammarScore: number;
  taskScore: number;
  coherenceScore: number;
  vocabularyScore: number;
  wordCount: number;
  errorCount: number;
  feedback?: string;
  detectedTone?: string;
  errors: WritingError[];
}

export interface WritingPrompt {
  id: ID;

  prompt: string;
  level: Level;
  type: WritingType;

  minWords: number;
  maxWords: number;

  topic: string;
  instructions: string;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface WritingSubmission {
  id: ID;

  userId: ID;
  promptId: ID;

  text: string;
  analysis?: WritingAnalysis;

  status: SubmissionStatus;

  submittedAt: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
