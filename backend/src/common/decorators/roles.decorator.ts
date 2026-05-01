import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtUserPayload } from 'src/modules/auth/interfaces/jwt-payload.interface';

export const UserRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request & { user: JwtUserPayload }>();
    return request.user?.role;
  },
);