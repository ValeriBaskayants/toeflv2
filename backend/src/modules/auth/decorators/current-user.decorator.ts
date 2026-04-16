import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtUserPayload } from '../interfaces/jwt-payload.interface';

// Usage: getProfile(@CurrentUser() user: JwtUserPayload)
// Extracts req.user set by JwtStrategy.validate()
// Controller never touches req directly
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUserPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as JwtUserPayload;
  },
);