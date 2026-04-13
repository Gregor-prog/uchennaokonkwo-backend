import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  // ─── Read ─────────────────────────────────────────────────────────────────

  async findAll() {
    return this.prisma.projects.findMany({
      include: { Media: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.projects.findUnique({
      where: { id },
      include: { Media: true },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found.`);
    return project;
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreateProjectDto, files: Express.Multer.File[]) {
    const { constituentName, ...rest } = dto;

    return this.prisma.projects.create({
      data: {
        ...rest,
        // schema field is misspelled — map DTO's constituentName to it
        consituentName: constituentName,
        ...(files.length > 0 && {
          Media: {
            create: files.map((f) => ({
              url: f.path,
              cloudinaryPublicId: f.filename,
              type: f.mimetype,
            })),
          },
        }),
      },
      include: { Media: true },
    });
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateProjectDto,
    files: Express.Multer.File[],
  ) {
    await this.findOne(id);

    const { constituentName, ...rest } = dto;

    return this.prisma.projects.update({
      where: { id },
      data: {
        ...rest,
        ...(constituentName !== undefined && {
          consituentName: constituentName,
        }),
        ...(files.length > 0 && {
          Media: {
            create: files.map((f) => ({
              url: f.path,
              cloudinaryPublicId: f.filename,
              type: f.mimetype,
            })),
          },
        }),
      },
      include: { Media: true },
    });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async remove(id: string) {
    await this.findOne(id);

    const mediaItems = await this.prisma.media.findMany({
      where: { projectId: id },
    });

    await this.prisma.projects.delete({ where: { id } });

    const publicIds = mediaItems
      .map((m) => m.cloudinaryPublicId)
      .filter((pid): pid is string => Boolean(pid));

    await this.cloudinary.deleteMany(publicIds);
  }

  // ─── Media management ─────────────────────────────────────────────────────

  async addMedia(projectId: string, files: Express.Multer.File[]) {
    await this.findOne(projectId);

    return this.prisma.projects.update({
      where: { id: projectId },
      data: {
        Media: {
          create: files.map((f) => ({
            url: f.path,
            cloudinaryPublicId: f.filename,
            type: f.mimetype,
          })),
        },
      },
      include: { Media: true },
    });
  }

  async removeMedia(projectId: string, mediaId: string) {
    await this.findOne(projectId);

    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, projectId },
    });

    if (!media)
      throw new NotFoundException('Media item not found on this project.');

    await this.prisma.media.delete({ where: { id: mediaId } });

    if (media.cloudinaryPublicId) {
      await this.cloudinary.delete(media.cloudinaryPublicId);
    }
  }
}
