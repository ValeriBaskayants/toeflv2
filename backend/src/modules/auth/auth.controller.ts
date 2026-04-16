import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { GoogleAuthGuard } from './guards/google-oauth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import type { JwtUserPayload } from './interfaces/jwt-payload.interface';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  // Sets HttpOnly cookie for refresh token
  private setRefreshCookie(res: Response, token: string): void {
    const expiresInDays = this.configService.getOrThrow<number>('jwt.refreshExpiresInDays');

    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      // In dev: false (browser needs it for localhost without HTTPS)
      // In prod: true (HTTPS required)
      secure: this.configService.get<string>('nodeEnv') === 'production',
      sameSite: 'lax', // 'lax' required for OAuth redirect flow (not 'strict')
      maxAge: expiresInDays * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
  }

  // Step 1: Redirect user to Google login page
  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth(): void {
    // Passport Guard intercepts and redirects to Google
    // This method body never executes
  }

  // Step 2: Google redirects back here with auth code
  // GoogleAuthGuard exchanges code → tokens → calls GoogleStrategy.validate()
  // req.user = AuthenticatedUser (our DB user, set by GoogleStrategy)
  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const dbUser = req.user as AuthenticatedUser;

    // Extract context here in controller — service never touches req
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    const ip = req.ip ?? 'unknown';

    const { accessToken, refreshToken } = await this.authService.handleGoogleCallback(
      dbUser,
      userAgent,
      ip,
    );

    // Refresh token → HttpOnly cookie (invisible to JavaScript)
    this.setRefreshCookie(res, refreshToken);

    const frontendUrl = this.configService.getOrThrow<string>('corsOrigin');

    // Access token → URL param (short-lived, frontend reads immediately and removes from URL)
    // Frontend must: read token, call history.replaceState, store in Zustand memory
    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);
  }

  // Rotate refresh token and issue new access token
  // Cookie is sent automatically by browser
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const rawRefreshToken: string | undefined = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (!rawRefreshToken) {
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('No refresh token provided');
    }

    const { accessToken, refreshToken: newRefreshToken } = await this.authService.refresh(
      rawRefreshToken,
      req.headers['user-agent'] ?? 'unknown',
      req.ip ?? 'unknown',
    );

    // Set rotated refresh token
    this.setRefreshCookie(res, newRefreshToken);

    return { accessToken };
  }

  // Logout: delete session from DB and clear cookie
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const rawRefreshToken: string | undefined = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (rawRefreshToken) {
      await this.authService.logout(rawRefreshToken);
    }

    this.clearRefreshCookie(res);
  }

  // Get current user profile
  // JWT guard already validated the token — just return payload or fetch full profile
  @Get('me')
  async getMe(@CurrentUser() jwtUser: JwtUserPayload): Promise<AuthenticatedUser | null> {
    // Fetch full profile (JWT payload only has id + role)
    return this.usersService.findById(jwtUser.id);
  }
}