import { type ID, Role, Level, type ISODateString } from '../globalTypes';

export interface User {
  id: ID;
  email: string;
  name: string;
  avatar: string | null;
  role: Role;

  currentLevel: Level;
  totalXp: number;
  streak: number;
  lastActivityDate: ISODateString | null;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface RefreshResponse {
  accessToken: string;
}
