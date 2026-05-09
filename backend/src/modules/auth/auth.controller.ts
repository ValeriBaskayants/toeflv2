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

  private setRefreshCookie(res: Response, token: string): void {
    const days = this.configService.getOrThrow<number>('jwt.refreshDays');

    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: this.configService.get<string>('nodeEnv') === 'production',
      sameSite: 'lax',
      maxAge: days * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth(): void {
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const dbUser = req.user as AuthenticatedUser;

    const userAgent = req.headers['user-agent'] ?? 'unknown';
    const ip = req.ip ?? 'unknown';

    const { accessToken, refreshToken } = await this.authService.handleGoogleCallback(
      dbUser,
      userAgent,
      ip,
    );

    this.setRefreshCookie(res, refreshToken);

    const frontendUrl = this.configService.getOrThrow<string>('corsOrigin');

    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);
  }

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

    this.setRefreshCookie(res, newRefreshToken);

    return { accessToken };
  }

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

  @Get('me')
  async getMe(@CurrentUser() jwtUser: JwtUserPayload): Promise<AuthenticatedUser | null> {
    return this.usersService.findById(jwtUser.id);
  }
}