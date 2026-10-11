import type { ID, ISODateString, Level, ListeningMode, ListeningType } from '../globalTypes';

export interface ListeningSegment {
  index: number;
  text: string;
  startSec: number;
  endSec: number;
  speaker?: string | null;
}

export type ListeningUserStatus = 'not_started' | 'in_progress' | 'completed';

export interface ListeningMaterialSummary {
  id: ID;
  title: string;
  topic: string;
  level: Level;
  type: ListeningType;
  speakerRate: number;
  speakerLang: string;
  speakerPitch: number;
  allowedModes: ListeningMode[];
  createdAt: ISODateString;
  _count: { questions: number };
  userStatus: ListeningUserStatus;
  bestScore: number | null;
}

export interface ListeningQuestionPublic {
  id: ID;
  question: string;
  options: string[];
  orderIndex: number;
}

export interface ListeningTranscript {
  fullText: string;
  segments: ListeningSegment[];
}

export interface ListeningSessionMaterial {
  id: ID;
  title: string;
  topic: string;
  level: Level;
  type: ListeningType;
  questions: ListeningQuestionPublic[];
  transcript: ListeningTranscript | null;
}

export interface ListeningSessionStart {
  id: ID;
  mode: ListeningMode;
  maxAllowedPlays: number;
  playCount: number;
  startedAt: ISODateString;
  answerWindowSec: number | null;
  material: ListeningSessionMaterial;
}

export interface ListeningAudioResponse {
  audioBase64: string;
  cached: boolean;
  playCount: number;
  maxAllowedPlays: number;
}

export interface ListeningAudioMeta {
  playCount: number;
  maxAllowedPlays: number;
  cached: boolean;
}

export interface PracticeAnswerResponse {
  recorded: true;
}

export interface StudyFeedback {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string | null;
}

export type ListeningAnswerResponse = PracticeAnswerResponse | StudyFeedback;

export interface ListeningReviewItem {
  questionId: ID;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  selectedIndex: number | null;
  timedOut: boolean;
  isCorrect: boolean;
}

export interface ListeningCompleteResult {
  id: ID;
  mode: ListeningMode;
  correctCount: number;
  totalCount: number;
  rawAccuracy: number;
  finalScore: number;
  xpEarned: number;
  completedAt: ISODateString;
  transcript: string;
  countedAsCompleted: boolean;
  detailedReview: ListeningReviewItem[];
}

export interface ListeningNote {
  id: string;
  text: string;
  createdAt: ISODateString;
}