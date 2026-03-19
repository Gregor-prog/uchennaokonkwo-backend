import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

/**
 * Authorization guard — runs after JwtAuthGuard has populated req.user.
 *
 * Rules:
 *  - If no @Roles() decorator is present, the route is accessible to any
 *    authenticated user.
 *  - ADMIN bypasses all role checks (super-user).
 *  - Otherwise the user must hold at least one of the required roles.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No role restriction on this route
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: { roles?: Role[] } }>();
    if (!user) return false;

    const userRoles: Role[] = user.roles ?? [];

    // ADMIN is a super-user — always allowed
    if (userRoles.includes(Role.ADMIN)) return true;

    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
