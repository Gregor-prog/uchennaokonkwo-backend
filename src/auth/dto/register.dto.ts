import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters.' })
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters.' })
  @MaxLength(50)
  lastName: string;

  /**
   * Password policy:
   *  - Minimum 8 characters
   *  - At least one uppercase letter
   *  - At least one lowercase letter
   *  - At least one digit
   *  - At least one special character: @$!%*?&
   */
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/, {
    message:
      'Password must include uppercase, lowercase, a number, and a special character (@$!%*?&).',
  })
  password: string;

  /**
   * Optional: only ADMIN users should be allowed to assign roles other
   * than VOLUNTEER. Enforce that at the controller/service level.
   */
  @IsOptional()
  @IsEnum(Role, { message: 'role must be ADMIN, MEDIA, or VOLUNTEER.' })
  role?: Role;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  constituentName?: string;
}
