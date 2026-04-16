import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { UsersService } from '../../users/users.service';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('google.clientId'),
      clientSecret: configService.getOrThrow<string>('google.clientSecret'),
      callbackURL: configService.getOrThrow<string>('google.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  // Called by Passport after Google redirects back with code
  // Returns value is stored in req.user
  async validate(
    _accessToken: string,   // Google's access token — we don't need it
    _refreshToken: string,  // Google's refresh token — we don't need it
    profile: Profile,
  ): Promise<AuthenticatedUser> {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      throw new UnauthorizedException('Google account must have a verified email');
    }

    // Find or create user in our DB — this is the ONLY DB call for auth
    return this.usersService.findOrCreate({
      googleId: profile.id,
      email,
      name: profile.displayName,
      avatar: profile.photos?.[0]?.value,
    });
  }
}