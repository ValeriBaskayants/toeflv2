import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import type { Session } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) { }

  // Cryptographically secure: 64 bytes = 512 bits of entropy
  generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  // SHA-256 is appropriate here: tokens are already high-entropy random bytes
  // bcrypt is overkill and too slow for refresh tokens
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // Public so AuthService can use it for session binding comparison
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

    // Convert to number just in case a string slipped through
    const days = Number(params.expiresInDays);

    // Fallback to 7 days if the value is missing or not a number
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

    // Also check expiry at the application level
    // (MongoDB TTL index handles cleanup asynchronously)
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
      // Session already deleted — idempotent, that's fine
    }
  }

  // Used for global logout (password change, security incident)
  async deleteAllUserSessions(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }
}