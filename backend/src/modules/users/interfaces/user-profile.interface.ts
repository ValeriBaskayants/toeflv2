import type { Level, Role } from '@prisma/client';

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
    role: Role;
    currentLevel: Level;
    totalXp: number;
    streak: number;
}