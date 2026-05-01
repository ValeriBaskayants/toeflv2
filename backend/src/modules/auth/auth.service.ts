import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@prisma/client';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly configService: ConfigService,
  ) { }

  private generateAccessToken(userId: string, role: Role): Promise<string> {
    const payload: JwtPayload = { sub: userId, role };
    return this.jwtService.signAsync(payload);
  }

  private getRefreshExpiresInDays(): number {
    return this.configService.getOrThrow<number>('jwt.refreshExpiresInDays');
  }


  async handleGoogleCallback(
    user: AuthenticatedUser,
    userAgent: string,
    ip: string,
  ): Promise<TokenPair> {
    const refreshToken = this.sessionsService.generateRefreshToken();

    await this.sessionsService.createSession({
      userId: user.id,
      refreshToken,
      userAgent,
      ip,
      expiresInDays: this.getRefreshExpiresInDays(),
    });

    const accessToken = await this.generateAccessToken(user.id, user.role);

    this.logger.log('USER_LOGGED_IN', { userId: user.id, ip });

    return { accessToken, refreshToken };
  }

  async refresh(
    rawRefreshToken: string,
    userAgent: string,
    ip: string,
  ): Promise<TokenPair> {
    const session = await this.sessionsService.findByToken(rawRefreshToken);

    if (session === null) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const incomingUaHash = this.sessionsService.hashUserAgent(userAgent);

    if (session.uaHash !== incomingUaHash) {
      await this.sessionsService.deleteSession(session.id);

      this.logger.warn('SESSION_UA_MISMATCH', {
        userId: session.userId,
        sessionId: session.id,
        ip,
      });

      throw new UnauthorizedException('Session invalidated: device fingerprint mismatch');
    }

    await this.sessionsService.deleteSession(session.id);

    const newRefreshToken = this.sessionsService.generateRefreshToken();

    await this.sessionsService.createSession({
      userId: session.userId,
      refreshToken: newRefreshToken,
      userAgent,
      ip,
      expiresInDays: this.getRefreshExpiresInDays(),
    });

    const user = await this.usersService.findById(session.userId);

    if (user === null) {
      throw new UnauthorizedException('User no longer exists');
    }

    const newAccessToken = await this.generateAccessToken(user.id, user.role);

    this.logger.log('REFRESH_ROTATED', { userId: user.id, sessionId: session.id });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }


  async logout(rawRefreshToken: string): Promise<void> {
    const session = await this.sessionsService.findByToken(rawRefreshToken);

    if (session !== null) {
      await this.sessionsService.deleteSession(session.id);
      this.logger.log('USER_LOGGED_OUT', { userId: session.userId });
    }
  }
}