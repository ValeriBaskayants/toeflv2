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


export interface GetListeningParams {
  level?: Level;
  type?: ListeningType;
  search?: string;
}

export interface ListeningMaterialListItem {
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
}

export interface ListeningMaterialDetail extends ListeningMaterial {
  openSession: {
    id: ID;
    mode: ListeningMode;
    playCount: number;
    maxAllowedPlays: number;
  } | null;
  recommendedRate: number;
}


export interface StartSessionPayload {
  materialId: ID;
  mode: ListeningMode;
}

export interface StartSessionResponse {
  id: ID;
  mode: ListeningMode;
  maxAllowedPlays: number;
  playCount: number;
  startedAt: ISODateString;
}

export interface PlayResponse {
  playCount: number;
  maxAllowedPlays: number;
}

export interface SubmitAnswerPayload {
  questionId: ID;
  selectedIndex: number;
  currentAudioSec?: number;
}

export interface SubmitAnswerResponse {
  isCorrect: boolean;
  correctIndex: number;
}

export interface SaveNotesPayload {
  notes: ListeningNote[];
}

export interface CompleteSessionResponse {
  id: ID;
  mode: ListeningMode;
  status: ListeningSessionStatus;
  correctCount: number;
  totalCount: number;
  rawAccuracy: number;
  finalScore: number;
  xpEarned: number;
  completedAt: ISODateString;
  transcript?: string;
}

export interface SessionHistoryItem {
  id: ID;
  mode: ListeningMode;
  status: ListeningSessionStatus;
  playCount: number;
  finalScore: number | null;
  xpEarned: number | null;
  startedAt: ISODateString;
  completedAt: ISODateString | null;
  material: {
    id: ID;
    title: string;
    level: Level;
    type: ListeningType;
  };
}