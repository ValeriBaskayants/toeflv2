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
  ) {}

  private generateAccessToken(userId: string, role: Role): Promise<string> {
    const payload: JwtPayload = { sub: userId, role };
    return this.jwtService.signAsync(payload);
  }

  // BUG FIX: was reading 'jwt.expiresIn' which is the access token TTL string ('15m')
  // The correct key for refresh token lifetime in DAYS is 'jwt.refreshExpiresInDays'
  private getRefreshExpiresInDays(): number {
    return this.configService.getOrThrow<number>('jwt.refreshExpiresInDays');
  }

  // ── handleGoogleCallback ───────────────────────────────────────────────────
  // Called by AuthController after GoogleStrategy.validate() puts the user in req.user.
  // Creates a new session and issues both tokens.

  async handleGoogleCallback(
    user: AuthenticatedUser,
    userAgent: string,
    ip: string,
  ): Promise<TokenPair> {
    const refreshToken = this.sessionsService.generateRefreshToken();

    await this.sessionsService.createSession({
      userId:        user.id,
      refreshToken,
      userAgent,
      ip,
      expiresInDays: this.getRefreshExpiresInDays(),
    });

    const accessToken = await this.generateAccessToken(user.id, user.role);

    this.logger.log('USER_LOGGED_IN', { userId: user.id, ip });

    return { accessToken, refreshToken };
  }

  // ── refresh ────────────────────────────────────────────────────────────────
  // Refresh token rotation:
  //   1. Find session by token hash
  //   2. Verify User-Agent binding (session hijacking guard)
  //   3. Delete old session
  //   4. Create new session with new token
  //   5. Return new token pair

  async refresh(
    rawRefreshToken: string,
    userAgent: string,
    ip: string,
  ): Promise<TokenPair> {
    const session = await this.sessionsService.findByToken(rawRefreshToken);

    if (session === null) {
      // Token not found: expired, rotated, or never existed
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const incomingUaHash = this.sessionsService.hashUserAgent(userAgent);

    if (session.uaHash !== incomingUaHash) {
      // UA mismatch: possible session theft from a different device.
      // Kill this specific session and force re-login.
      await this.sessionsService.deleteSession(session.id);

      this.logger.warn('SESSION_UA_MISMATCH', {
        userId:   session.userId,
        sessionId: session.id,
        ip,
      });

      throw new UnauthorizedException('Session invalidated: device fingerprint mismatch');
    }

    // Rotation: delete old → create new (if we crash between these two operations,
    // the old token is gone and the user must re-login — acceptable trade-off)
    await this.sessionsService.deleteSession(session.id);

    const newRefreshToken = this.sessionsService.generateRefreshToken();

    await this.sessionsService.createSession({
      userId:        session.userId,
      refreshToken:  newRefreshToken,
      userAgent,
      ip,
      expiresInDays: this.getRefreshExpiresInDays(),
    });

    // One DB call per refresh to get the current role (role can change: user → admin)
    const user = await this.usersService.findById(session.userId);

    if (user === null) {
      // User deleted after session was created
      throw new UnauthorizedException('User no longer exists');
    }

    const newAccessToken = await this.generateAccessToken(user.id, user.role);

    this.logger.log('REFRESH_ROTATED', { userId: user.id, sessionId: session.id });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // ── logout ─────────────────────────────────────────────────────────────────
  // Idempotent: if the session is already gone, that's fine.

  async logout(rawRefreshToken: string): Promise<void> {
    const session = await this.sessionsService.findByToken(rawRefreshToken);

    if (session !== null) {
      await this.sessionsService.deleteSession(session.id);
      this.logger.log('USER_LOGGED_OUT', { userId: session.userId });
    }
  }
}