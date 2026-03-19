import { SetMetadata } from '@nestjs/common';

/**
 * Mark a route as public — the global JwtAuthGuard will skip it.
 *
 * @example
 *   @Public()
 *   @Post('login')
 *   login() {}
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
