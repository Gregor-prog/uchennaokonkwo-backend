import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Validates the long-lived refresh token sent in the request body.
 * The raw token string is forwarded alongside the decoded payload so
 * AuthService can verify it against the stored hash.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = (req.body as { refreshToken?: string })?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing.');
    }

    return { ...payload, refreshToken };
  }
}
