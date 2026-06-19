import { type ID, type Level, type Difficulty, type ISODateString } from '../globalTypes';



export type UserStatus = 'not_started' | 'in_progress' | 'mastered';



export interface Blank {
  position: number;
  answer: string;
  options: string[];
}



export interface Exercise {
  id: ID;
  topic: string;
  level: Level;
  difficulty: Difficulty;
  sentence: string;
  blanks: Blank[];
  explanation: string;
  tags: string[];
  userStatus?: UserStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}



export interface BlankResult {
  position: number;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  hint?: string;
}

export interface SubmitResult {
  results: BlankResult[];
  accuracy: number;
  xpEarned: number;
  countedAsCompleted: boolean;
  explanation: string;
  feedback: string;
}



export interface GetExercisesParams {
  level?: Level;
  difficulty?: Difficulty;
  topic?: string;
  limit?: number;
}