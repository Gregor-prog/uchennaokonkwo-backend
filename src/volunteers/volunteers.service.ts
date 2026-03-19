import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVolunteerDto } from './dto/create-volunteer.dto';

@Injectable()
export class VolunteersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVolunteerDto) {
    const existing = await this.prisma.volunteers.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException('A volunteer record with this email already exists.');
    }

    return this.prisma.volunteers.create({
      data: { ...dto, email: dto.email.toLowerCase().trim() },
    });
  }

  async findAll() {
    return this.prisma.volunteers.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const volunteer = await this.prisma.volunteers.findUnique({ where: { id } });
    if (!volunteer) throw new NotFoundException(`Volunteer ${id} not found.`);
    return volunteer;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.volunteers.delete({ where: { id } });
  }
}
