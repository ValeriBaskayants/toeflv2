import { type ID, Level, Difficulty, type ISODateString } from '../globalTypes';




export interface MultipleChoice {
  id: ID;

  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;

  topic: string;
  level: Level;
  difficulty: Difficulty;


  category: string;
  isAvailableForPlacement: boolean;
  difficultyRating: number | null;
  discriminationRating: number | null;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}




export interface CreateMultipleChoiceDto {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;

  topic?: string;
  level: Level;
  difficulty?: Difficulty;


  category?: string;
  isAvailableForPlacement?: boolean;
  difficultyRating?: number;
  discriminationRating?: number;
}

export type UpdateMultipleChoiceDto = Partial<CreateMultipleChoiceDto>;

export interface BulkCreateMultipleChoiceDto {
  items: CreateMultipleChoiceDto[];
}

export interface BulkCreateResponse {
  totalProcessed: number;
  inserted: number;
  skipped: number;
}




export interface GetMultipleChoiceQuery {
  level?: Level;
  difficulty?: Difficulty;
  topic?: string;
  limit?: number;
}




export interface SubmitMCAnswerDto {
  questionId: string;
  selectedIndex: number;
}

export interface SubmitMCSessionDto {
  answers: SubmitMCAnswerDto[];
}


export interface SubmitMCResult {
  questionId: string;
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
}

export interface SubmitMCSessionResponse {
  results: SubmitMCResult[];
  correctCount: number;
  totalCount: number;
  accuracy: number;
  xpEarned: number;
}