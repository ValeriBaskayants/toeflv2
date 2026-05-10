import { type  ID, Level, Difficulty, type ISODateString } from '../globalTypes';

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

  createdAt: ISODateString;
  updatedAt: ISODateString;
}