import { Role } from '../enums/role.enum';

/**
 * Shape of the user object attached to every authenticated request.
 * Populated by JwtStrategy.validate() and available via @CurrentUser().
 */
export interface JwtUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
}
