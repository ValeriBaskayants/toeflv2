import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildInitialProgress } from 'src/constants/level-requirements';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface UserWithProgress extends AuthenticatedUser {
  currentLevel: string;
  totalXp: number;
  streak: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}


  private get userSelect() {
    return {
      id:           true,
      email:        true,
      name:         true,
      avatar:       true,
      role:         true,
      currentLevel: true,
      totalXp:      true,
      streak:       true,
    } as const;
  }


  async findOrCreate(profile: GoogleProfile): Promise<AuthenticatedUser> {
    const byGoogle = await this.prisma.user.findUnique({
      where:  { googleId: profile.googleId },
      select: this.userSelect,
    });

    if (byGoogle !== null) {
      return this.prisma.user.update({
        where:  { id: byGoogle.id },
        data:   { name: profile.name, avatar: profile.avatar ?? null },
        select: this.userSelect,
      });
    }

    const byEmail = await this.prisma.user.findUnique({
      where:  { email: profile.email },
      select: this.userSelect,
    });

    if (byEmail !== null) {
      return this.prisma.user.update({
        where:  { id: byEmail.id },
        data:   { googleId: profile.googleId, avatar: profile.avatar ?? null },
        select: this.userSelect,
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
            googleId:     profile.googleId,
            email:        profile.email,
            name:         profile.name,
            avatar:       profile.avatar ?? null,
            currentLevel: initialLevel,
            totalXp:      0,
            streak:       0,
          },
          select: this.userSelect,
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
      where:  { id },
      select: this.userSelect,
    });
  }
}