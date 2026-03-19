import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.users.findUnique({
      where: { id },
      include: { userRoles: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
      include: { userRoles: true },
    });
  }

  /** Store or clear the hashed refresh token. */
  async updateRefreshToken(userId: string, refreshTokenHash: string | null) {
    await this.prisma.users.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  async setLastLogin(userId: string) {
    await this.prisma.users.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
