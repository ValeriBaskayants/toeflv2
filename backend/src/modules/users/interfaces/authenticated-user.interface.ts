import type { Role } from '@prisma/client';

// Shape of user returned from DB after Google OAuth
// Used as req.user after GoogleStrategy.validate()
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: Role;
}