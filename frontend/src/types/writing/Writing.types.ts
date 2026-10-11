import { type ID, Level, WritingType, SubmissionStatus, type ISODateString } from '../globalTypes';

export type ScoredWritingType = Extract<WritingType, WritingType.EMAIL | WritingType.ACADEMIC_DISCUSSION>;

export interface DiscussionPeerResponse {
  authorName: string;
  text: string;
}

export interface WritingPrompt {
  id: ID;
  type: WritingType;
  prompt: string;
  discussionPeerResponses: DiscussionPeerResponse[];
  level: Level;
  topic: string;
  minWords: number;
  maxWords: number;
  timeLimitSec: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface WritingPromptWithStatus extends WritingPrompt {
  userBestScore: number | null;
  userAttemptCount: number;
  userStatus: 'not_attempted' | 'in_progress' | 'completed';
}

export interface WritingError {
  message: string;
  context: string;
  offset: number;
  length: number;
  replacements: string[];
}

export interface WritingAnalysis {
  overallScore: number;
  officialBand: number;
  grammarScore: number;
  taskScore: number;
  coherenceScore: number;
  vocabularyScore: number;
  taskSpecificScore: number;
  wordCount: number;
  errorCount: number;
  feedback?: string;
  detectedTone?: string;
  errors: WritingError[];
}

// Бэкенд всегда включает `prompt` через `include: { prompt: true }` —
// и на GET /writing/submissions/:id, и на GET /writing/submissions.
// Это план WritingPrompt, БЕЗ userBestScore/userStatus — эти поля вычисляются
// только в getPrompts() и на вложенный prompt здесь не проставляются.
export interface WritingSubmission {
  id: ID;
  userId: ID;
  promptId: ID;
  prompt: WritingPrompt;
  text: string;
  analysis?: WritingAnalysis;
  status: SubmissionStatus;
  timeSpentSec?: number;
  submittedAt: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface SessionPromptSnapshot {
  id: ID;
  type: WritingType;
  prompt: string;
  discussionPeerResponses: DiscussionPeerResponse[];
  topic: string;
}

export interface StartSessionResponse {
  sessionId: string;
  minWords: number;
  maxWords: number;
  timeLimitSec: number;
  startedAt: ISODateString;
  prompt: SessionPromptSnapshot;
}

export interface SubmitSessionResponse {
  submissionId: string;
  status: 'PENDING';
  attemptNumber: number;
  willCountForProgress: boolean;
}