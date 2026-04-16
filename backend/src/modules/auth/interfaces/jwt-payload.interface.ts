import type { Role } from '@prisma/client';

// What we encode INTO the JWT (access token payload)
export interface JwtPayload {
  sub: string; // userId
  role: Role;
  // iat, exp added automatically by JwtService
}

// What req.user contains AFTER JwtStrategy.validate()
export interface JwtUserPayload {
  id: string;
  role: Role;
}