









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


export interface WritingPromptWithStatus extends WritingPrompt {
  
  userBestScore: number | null;
  userAttemptCount: number;
  
  userStatus: 'not_attempted' | 'in_progress' | 'completed';
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




export interface SubmitWritingResponse {
  submissionId: string;
  status: 'PENDING';
  
  attemptNumber: number;
  
  willCountForProgress: boolean;
}



export interface WritingUserStats {
  totalSubmissions: number;
  avgScore: number | null;
  bestScore: number | null;
  recentTrend: 'improving' | 'declining' | 'stable' | null;
}