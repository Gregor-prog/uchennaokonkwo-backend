import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import multer from 'multer';

@Injectable()
export class DonationsService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async create(dto: CreateDonationDto, file?: Express.Multer.File) {
    let imageUrl: string | undefined = undefined;
    if (file) {
      const upload = await this.cloudinary.uploadImage(file);
      imageUrl = upload.url;
    }
    return this.prisma.donators.create({
      data: {
        ...dto,
        email: dto.email.toLowerCase().trim(),
        ImageUrl: imageUrl,
      },
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
