import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Mark an endpoint as public (skip JWT guard)
// Usage: @Public() on controller or method
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);