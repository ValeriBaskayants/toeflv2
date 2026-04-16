import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Upsert by googleId: finds existing user or creates new one
  // On re-login: updates name/avatar in case they changed in Google account
  // Email is NOT updated on re-login (security: prevents email hijacking)
  async findOrCreate(profile: GoogleProfile): Promise<AuthenticatedUser> {
    return this.prisma.user.upsert({
      where: { googleId: profile.googleId },
      update: {
        name: profile.name,
        avatar: profile.avatar ?? null,
      },
      create: {
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar ?? null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
      },
    });
  }

  async findById(id: string): Promise<AuthenticatedUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
      },
    });
  }
}