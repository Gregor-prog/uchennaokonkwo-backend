import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    // Makes process.env available everywhere; validates required vars at startup
    ConfigModule.forRoot({ isGlobal: true }),

    // Global rate limiting: 100 requests / minute per IP by default.
    // Individual routes can override with @Throttle().
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),

    PrismaModule,      // @Global() — PrismaService injected anywhere
    CloudinaryModule,  // @Global() — CloudinaryService injected anywhere
    AuthModule,
    UsersModule,
    PostsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Guard execution order (applied globally, in declaration order):
    // 1. ThrottlerGuard  — reject requests that exceed rate limits
    // 2. JwtAuthGuard    — reject unauthenticated requests (bypass with @Public())
    // 3. RolesGuard      — reject requests from under-privileged roles
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
