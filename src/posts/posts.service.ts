import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { JwtUser } from '../common/interfaces/jwt-user.interface';
import { Role } from '../common/enums/role.enum';
import { PostStatus } from '../common/enums/post-status.enum';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

/** Fields exposed for the post author — never leak passwordHash etc. */
const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  // ─── Read ─────────────────────────────────────────────────────────────────

  async findAll() {
    return this.prisma.posts.findMany({
      include: {
        Media: true,
        author: { select: AUTHOR_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const post = await this.prisma.posts.findUnique({
      where: { id },
      include: {
        Media: true,
        author: { select: AUTHOR_SELECT },
      },
    });

    if (!post) throw new NotFoundException(`Post ${id} not found.`);
    return post;
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(
    dto: CreatePostDto,
    authorId: string,
    files: Express.Multer.File[],
  ) {
    const { multilingualContent, ...fields } = dto;

    return this.prisma.posts.create({
      data: {
        ...fields,
        status: fields.status ?? PostStatus.DRAFT,
        authorId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        multilingualContent: (multilingualContent ?? undefined) as any,
        ...(files.length > 0 && {
          Media: {
            create: files.map((f) => ({
              url: f.path, // Cloudinary secure_url
              cloudinaryPublicId: f.filename, // Cloudinary public_id
              type: f.mimetype,
            })),
          },
        }),
      },
      include: {
        Media: true,
        author: { select: AUTHOR_SELECT },
      },
    });
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdatePostDto, files: Express.Multer.File[]) {
    await this.findOne(id);

    const { multilingualContent, ...fields } = dto;

    return this.prisma.posts.update({
      where: { id },
      data: {
        ...fields,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(multilingualContent !== undefined && {
          multilingualContent: multilingualContent as any,
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
      include: {
        Media: true,
        author: { select: AUTHOR_SELECT },
      },
    });
  }

  // ─── Delete post ──────────────────────────────────────────────────────────

  /**
   * ADMIN can delete any post.
   * MEDIA can only delete posts they authored — throws 403 otherwise.
   */
  async remove(id: string, user: JwtUser) {
    const post = await this.findOne(id);

    if (!user.roles.includes(Role.ADMIN) && post.authorId !== user.id) {
      throw new ForbiddenException('You can only delete posts you created.');
    }

    // Collect public IDs before the cascade delete wipes the Media rows
    const mediaItems = await this.prisma.media.findMany({
      where: { postId: id },
    });

    await this.prisma.posts.delete({ where: { id } });

    // Remove assets from Cloudinary after the DB row is gone
    const publicIds = mediaItems
      .map((m) => m.cloudinaryPublicId)
      .filter((pid): pid is string => Boolean(pid));

    await this.cloudinary.deleteMany(publicIds);
  }

  // ─── Media management ─────────────────────────────────────────────────────

  /**
   * Uploads additional images to an existing post.
   * ADMIN: any post. MEDIA: own posts only.
   */
  async addMedia(postId: string, files: Express.Multer.File[], user: JwtUser) {
    const post = await this.findOne(postId);

    if (!user.roles.includes(Role.ADMIN) && post.authorId !== user.id) {
      throw new ForbiddenException(
        'You can only add media to posts you created.',
      );
    }

    return this.prisma.posts.update({
      where: { id: postId },
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

  /**
   * Removes a single media item from a post and deletes it from Cloudinary.
   * ADMIN: any post. MEDIA: own posts only.
   */
  async removeMedia(postId: string, mediaId: string, user: JwtUser) {
    const post = await this.findOne(postId);

    if (!user.roles.includes(Role.ADMIN) && post.authorId !== user.id) {
      throw new ForbiddenException(
        'You can only remove media from posts you created.',
      );
    }

    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, postId },
    });

    if (!media)
      throw new NotFoundException('Media item not found on this post.');

    await this.prisma.media.delete({ where: { id: mediaId } });

    if (media.cloudinaryPublicId) {
      await this.cloudinary.delete(media.cloudinaryPublicId);
    }
  }
}
