import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildInitialProgress } from '../../constants/level-requirements';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type { UserProfile } from './interfaces/user-profile.interface';

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}

const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  role: true,
  currentLevel: true,
  totalXp: true,
  streak: true,
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(profile: GoogleProfile): Promise<AuthenticatedUser> {
    const byGoogle = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
      select: { id: true, email: true, name: true, avatar: true, role: true },
    });

    if (byGoogle !== null) {
      return this.prisma.user.update({
        where: { id: byGoogle.id },
        data: { name: profile.name, avatar: profile.avatar ?? null },
        select: { id: true, email: true, name: true, avatar: true, role: true },
      });
    }

    const byEmail = await this.prisma.user.findUnique({
      where: { email: profile.email },
      select: { id: true, email: true, name: true, avatar: true, role: true },
    });

    if (byEmail !== null) {
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId: profile.googleId, avatar: profile.avatar ?? null },
        select: { id: true, email: true, name: true, avatar: true, role: true },
      });
    }

    return this.createWithProgress(profile);
  }

  private async createWithProgress(profile: GoogleProfile): Promise<AuthenticatedUser> {
    const initialLevel = 'A1' as const;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            googleId: profile.googleId,
            email: profile.email,
            name: profile.name,
            avatar: profile.avatar ?? null,
            currentLevel: initialLevel,
            totalXp: 0,
            streak: 0,
          },
          select: { id: true, email: true, name: true, avatar: true, role: true },
        });

        await tx.levelProgress.create({
          data: {
            userId: user.id,
            ...buildInitialProgress(initialLevel),
          },
        });

        return user;
      });
    } catch (error: unknown) {
      this.logger.error('Failed to create user with initial progress', error);
      throw new InternalServerErrorException('Account creation failed. Please try again.');
    }
  }

  async findById(id: string): Promise<AuthenticatedUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, avatar: true, role: true },
    });
  }

  async findProfileById(id: string): Promise<UserProfile | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: USER_PROFILE_SELECT,
    });
  }
}