import { Injectable, UnauthorizedException } from '@nestjs/common';
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
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly configService: ConfigService,
  ) {}

  private generateAccessToken(userId: string, role: Role): Promise<string> {
    const payload: JwtPayload = { sub: userId, role };
    return this.jwtService.signAsync(payload);
  }

  private getRefreshExpiresInDays(): number {
    return this.configService.getOrThrow<number>('jwt.refreshExpiresInDays');
  }

  // Called after Google OAuth: user is already fetched/created by GoogleStrategy
  // No additional DB call for user here — GoogleStrategy already did it
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

    return { accessToken, refreshToken };
  }

  // Refresh token rotation:
  // Old session deleted → new session created → new token pair issued
  // If token not found: expired or already used → force re-login
  // If UA changed: potential session hijacking → delete session, force re-login
  async refresh(
    rawRefreshToken: string,
    userAgent: string,
    ip: string,
  ): Promise<TokenPair> {
    const session = await this.sessionsService.findByToken(rawRefreshToken);

    if (!session) {
      // Token not found: either expired or already rotated
      // Can't identify user without additional tracking, so just reject
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Session binding: User-Agent must match
    const incomingUaHash = this.sessionsService.hashUserAgent(userAgent);

    if (session.uaHash !== incomingUaHash) {
      // UA changed — potential session theft from different device
      // Kill this specific session and force re-login
      await this.sessionsService.deleteSession(session.id);
      throw new UnauthorizedException('Session invalidated: device fingerprint mismatch');
    }

    // Rotation: atomically delete old session and create new one
    // If we crash between these two operations, the old token is gone
    // and the user will need to re-login — acceptable trade-off
    await this.sessionsService.deleteSession(session.id);

    const newRefreshToken = this.sessionsService.generateRefreshToken();

    await this.sessionsService.createSession({
      userId: session.userId,
      refreshToken: newRefreshToken,
      userAgent,
      ip,
      expiresInDays: this.getRefreshExpiresInDays(),
    });

    // Need role for new access token — one DB call per refresh (acceptable)
    const user = await this.usersService.findById(session.userId);

    if (!user) {
      // User deleted after session was created
      throw new UnauthorizedException('User no longer exists');
    }

    const newAccessToken = await this.generateAccessToken(user.id, user.role);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // Logout: delete specific session
  // Idempotent: if session already gone, that's fine
  async logout(rawRefreshToken: string): Promise<void> {
    const session = await this.sessionsService.findByToken(rawRefreshToken);

    if (session) {
      await this.sessionsService.deleteSession(session.id);
    }
  }
}