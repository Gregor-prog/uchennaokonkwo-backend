import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDonationDto } from './dto/create-donation.dto';

@Injectable()
export class DonationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDonationDto) {
    const existing = await this.prisma.donators.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException(
        'A donation record with this email already exists.',
      );
    }

    return this.prisma.donators.create({
      data: { ...dto, email: dto.email.toLowerCase().trim() },
    });
  }

  async findAll() {
    return this.prisma.donators.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const donation = await this.prisma.donators.findUnique({ where: { id } });
    if (!donation) throw new NotFoundException(`Donation ${id} not found.`);
    return donation;
  }
}
