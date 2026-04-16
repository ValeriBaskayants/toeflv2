import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload, JwtUserPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      // Access token comes ONLY from Authorization: Bearer header
      // NOT from cookies (refresh token is in cookie, access token is in memory)
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  // NO DB CALL — the JWT is cryptographically verified above
  // Trust the payload: it's signed and not expired
  // Performance: this runs on EVERY protected request
  validate(payload: JwtPayload): JwtUserPayload {
    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException('Malformed token payload');
    }

    return {
      id: payload.sub,
      role: payload.role,
    };
  }
}