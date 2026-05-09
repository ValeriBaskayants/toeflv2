import type { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string; // userId
  role: Role;
}

export interface JwtUserPayload {
  id: string;
  role: Role;
}