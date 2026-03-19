import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUser } from '../interfaces/jwt-user.interface';

/**
 * Extracts the authenticated user from the request object.
 *
 * @example
 *   @Get('me')
 *   getProfile(@CurrentUser() user: JwtUser) {}
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtUser }>();
    return request.user;
  },
);
