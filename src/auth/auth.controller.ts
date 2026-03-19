import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /api/v1/auth/register
   * Stricter rate limit — prevents account enumeration via bulk registration.
   */
  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /api/v1/auth/login
   * LocalStrategy validates email + password before the handler is reached.
   * @Body LoginDto is validated by the global ValidationPipe.
   */
  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Request() req: any, @Body() _dto: LoginDto) {
    return this.authService.login(req.user);
  }

  /**
   * POST /api/v1/auth/refresh
   * JwtRefreshStrategy validates the refresh token before the handler runs.
   * Issues a new access + refresh token pair (rotation).
   */
  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Request() req: any, @Body() _dto: RefreshTokenDto) {
    return this.authService.refreshTokens(req.user.sub, req.user.refreshToken);
  }

  /**
   * POST /api/v1/auth/logout
   * Clears the stored refresh token hash — all subsequent refresh attempts fail.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Request() req: any) {
    return this.authService.logout(req.user.id);
  }

  /**
   * GET /api/v1/auth/me
   * Returns the authenticated user's profile (populated by JwtStrategy.validate).
   */
  @Get('me')
  getMe(@Request() req: any) {
    return req.user;
  }
}
