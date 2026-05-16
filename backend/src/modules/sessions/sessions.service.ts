import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import type { Session } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) { }


  generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }



  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }


  hashUserAgent(userAgent: string): string {
    return createHash('sha256').update(userAgent).digest('hex');
  }


  async createSession(params: {
    userId: string;
    refreshToken: string;
    userAgent: string;
    ip: string;
    expiresInDays: number;
  }): Promise<Session> {
    const tokenHash = this.hashToken(params.refreshToken);
    const uaHash = this.hashUserAgent(params.userAgent);


    const days = Number(params.expiresInDays);


    const safeDays = isNaN(days) ? 7 : days;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + safeDays);

    return this.prisma.session.create({
      data: {
        userId: params.userId,
        tokenHash,
        uaHash,
        ip: params.ip,
        expiresAt,
      },
    });
  }

  async findByToken(rawToken: string): Promise<Session | null> {
    const tokenHash = this.hashToken(rawToken);



    return this.prisma.session.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.prisma.session.delete({ where: { id: sessionId } });
    } catch {

    }
  }


  async deleteAllUserSessions(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }
}