import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../common/enums/role.enum';
import { JwtPayload } from './strategies/jwt.strategy';

/** bcrypt cost factor — 12 is the recommended production value. */
const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  // ─── Called by LocalStrategy ─────────────────────────────────────────────

  /**
   * Returns the user record if credentials are valid, null otherwise.
   * Using a constant-time bcrypt compare prevents timing-based user enumeration.
   */
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email.toLowerCase().trim());

    // Guard: account must exist and be active
    if (!user || !user.isActive) return null;

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) return null;

    return user;
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    // Self-registration always creates a VOLUNTEER; an admin can pass a role
    // through a separate admin-only endpoint if needed.
    const role = dto.role ?? Role.VOLUNTEER;

    const existing = await this.usersService.findByEmail(dto.email.toLowerCase().trim());
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.users.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        passwordHash,
        constituentName: dto.constituentName,
        userRoles: {
          create: {
            role,
            description: `${role.charAt(0)}${role.slice(1).toLowerCase()} access`,
          },
        },
      },
      include: { userRoles: true },
    });

    const roles = user.userRoles.map((ur) => ur.role as Role);
    const tokens = await this._issueTokens(user.id, user.email, roles);
    await this._saveRefreshTokenHash(user.id, tokens.refreshToken);
    await this.usersService.setLastLogin(user.id);

    return { user: this._sanitize(user), ...tokens };
  }

  /** Called after LocalStrategy has already validated the password. */
  async login(user: any) {
    const roles: Role[] = (user.userRoles ?? []).map((ur: any) => ur.role as Role);
    const tokens = await this._issueTokens(user.id, user.email, roles);
    await this._saveRefreshTokenHash(user.id, tokens.refreshToken);
    await this.usersService.setLastLogin(user.id);

    return { user: this._sanitize(user), ...tokens };
  }

  /**
   * Refresh token rotation:
   *   1. Verify the stored hash matches the supplied raw token.
   *   2. If it doesn't, assume token theft → revoke all sessions.
   *   3. Issue a fresh pair and persist the new refresh token hash.
   */
  async refreshTokens(userId: string, rawRefreshToken: string) {
    const user = await this.usersService.findById(userId);

    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw new ForbiddenException('Access denied.');
    }

    const tokenMatches = await bcrypt.compare(rawRefreshToken, user.refreshTokenHash);

    if (!tokenMatches) {
      // Possible token theft — invalidate every session for this user
      await this.usersService.updateRefreshToken(userId, null);
      throw new ForbiddenException(
        'Refresh token is invalid. All sessions have been revoked for your safety.',
      );
    }

    const roles: Role[] = (user.userRoles ?? []).map((ur: any) => ur.role as Role);
    const tokens = await this._issueTokens(user.id, user.email, roles);
    await this._saveRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private async _issueTokens(userId: string, email: string, roles: Role[]) {
    const payload: JwtPayload = { sub: userId, email, roles };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d') as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async _saveRefreshTokenHash(userId: string, rawToken: string) {
    const hash = await bcrypt.hash(rawToken, SALT_ROUNDS);
    await this.usersService.updateRefreshToken(userId, hash);
  }

  /** Strip sensitive fields before sending user data to the client. */
  private _sanitize(user: any) {
    const { passwordHash, refreshTokenHash, ...safe } = user;
    return safe;
  }
}
