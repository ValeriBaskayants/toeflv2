import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { Response, Request } from 'express';
import { GoogleAuthGuard } from './guards/google-oauth.guard';
import { AuthService } from './auth.service'; 

export interface RequestUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("google")
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Req() req: Request) {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const { access_token } = await this.authService.login(req.user as RequestUser);

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, 
    });

    return res.redirect('http://localhost:5173/dashboard');
  }
}