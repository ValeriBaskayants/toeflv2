import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { isValidTimeZone } from '../utils/timezone.util';

export const UserTimezone = createParamDecorator((_data: unknown, ctx: ExecutionContext): string | undefined => {
  const raw = ctx.switchToHttp().getRequest<Request>().headers['x-timezone'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value !== undefined && isValidTimeZone(value) ? value : undefined;
});