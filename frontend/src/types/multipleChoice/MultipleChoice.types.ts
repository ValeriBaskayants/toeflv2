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
}

export type UpdateMultipleChoiceDto = Partial<CreateMultipleChoiceDto>;
