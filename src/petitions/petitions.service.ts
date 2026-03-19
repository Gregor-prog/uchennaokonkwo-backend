import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePetitionDto } from './dto/create-petition.dto';

@Injectable()
export class PetitionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePetitionDto) {
    return this.prisma.petitions.create({ data: dto });
  }

  async findAll() {
    return this.prisma.petitions.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const petition = await this.prisma.petitions.findUnique({ where: { id } });
    if (!petition) throw new NotFoundException(`Petition ${id} not found.`);
    return petition;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.petitions.delete({ where: { id } });
  }
}
