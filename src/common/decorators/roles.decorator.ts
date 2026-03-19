import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

/**
 * Restrict a route to one or more roles.
 * ADMIN always passes regardless of the roles listed here.
 *
 * @example
 *   @Roles(Role.ADMIN, Role.MEDIA)
 *   @Get('posts')
 *   getPosts() {}
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
