import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';
import { Role } from '../common/enums/role.enum';
import {
  postsMulterOptions,
  MAX_FILES_PER_REQUEST,
} from '../common/config/multer.config';

/**
 * Access matrix
 * ─────────────────────────────────────────────────────
 * Action              PUBLIC  ADMIN   MEDIA               VOLUNTEER
 * List / Get          ✓       ✓       ✓                   ✓
 * Create              ✗       ✓       ✓                   ✗
 * Update              ✗       ✓       ✓ (any post)        ✗
 * Delete              ✗       ✓ (any) ✓ (own posts only)  ✗
 * Add / Remove media  ✗       ✓ (any) ✓ (own posts only)  ✗
 * ─────────────────────────────────────────────────────
 *
 * Read endpoints are public (@Public). Write endpoints require
 * ADMIN or MEDIA; VOLUNTEER is blocked on all write routes.
 */
@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  // ─── GET /posts — public ──────────────────────────────────────────────────

  @Public()
  @Get()
  findAll() {
    return this.postsService.findAll();
  }

  // ─── GET /posts/:id — public ──────────────────────────────────────────────

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  // ─── POST /posts ──────────────────────────────────────────────────────────

  /**
   * Creates a post, optionally attaching images in the same request.
   * Send as multipart/form-data with the field name "images" for files.
   */
  @Post()
  @Roles(Role.ADMIN, Role.MEDIA)
  @UseInterceptors(
    FilesInterceptor('images', MAX_FILES_PER_REQUEST, postsMulterOptions),
  )
  create(
    @Body() dto: CreatePostDto,
    @CurrentUser() user: JwtUser,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.postsService.create(dto, user.id, files ?? []);
  }

  // ─── PATCH /posts/:id ─────────────────────────────────────────────────────

  /**
   * Updates post fields and/or appends new images.
   * Any new files sent under "images" are added to the post's media list.
   * To remove individual media items use DELETE /posts/:id/media/:mediaId.
   */
  @Patch(':id')
  @Roles(Role.ADMIN, Role.MEDIA)
  @UseInterceptors(
    FilesInterceptor('images', MAX_FILES_PER_REQUEST, postsMulterOptions),
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.postsService.update(id, dto, files ?? []);
  }

  // ─── DELETE /posts/:id ────────────────────────────────────────────────────

  /**
   * ADMIN: can delete any post.
   * MEDIA: can only delete posts they authored — service throws 403 otherwise.
   */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.MEDIA)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.postsService.remove(id, user);
  }

  // ─── POST /posts/:id/media ────────────────────────────────────────────────

  /**
   * Uploads additional images to an existing post.
   * ADMIN: any post. MEDIA: own posts only.
   */
  @Post(':id/media')
  @Roles(Role.ADMIN, Role.MEDIA)
  @UseInterceptors(
    FilesInterceptor('images', MAX_FILES_PER_REQUEST, postsMulterOptions),
  )
  addMedia(
    @Param('id') postId: string,
    @CurrentUser() user: JwtUser,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.postsService.addMedia(postId, files ?? [], user);
  }

  // ─── DELETE /posts/:id/media/:mediaId ─────────────────────────────────────

  /**
   * Removes a single media item from a post and deletes the file from disk.
   * ADMIN: any post. MEDIA: own posts only.
   */
  @Delete(':id/media/:mediaId')
  @Roles(Role.ADMIN, Role.MEDIA)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMedia(
    @Param('id') postId: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.postsService.removeMedia(postId, mediaId, user);
  }
}
