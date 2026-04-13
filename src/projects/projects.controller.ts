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

import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import {
  projectsMulterOptions,
  MAX_FILES_PER_REQUEST,
} from '../common/config/multer.config';

/**
 * Access matrix
 * ────────────────────────────────────────────────────
 * Action                  PUBLIC  ADMIN
 * List / Get              ✓       ✓
 * Create                  ✗       ✓
 * Update                  ✗       ✓
 * Delete                  ✗       ✓
 * Add / Remove media      ✗       ✓
 * ────────────────────────────────────────────────────
 *
 * Projects are publicly visible constituency work items.
 * All write operations are restricted to ADMIN only.
 */
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  // ─── GET /projects — public ───────────────────────────────────────────────

  @Public()
  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  // ─── GET /projects/:id — public ───────────────────────────────────────────

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  // ─── POST /projects — ADMIN only ─────────────────────────────────────────

  /**
   * Creates a project. Coordinates arrive as form fields (strings) and are
   * coerced to numbers by @Type(() => Number) in the DTO.
   * Send as multipart/form-data with the field name "images" for files.
   */
  @Post()
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FilesInterceptor('images', MAX_FILES_PER_REQUEST, projectsMulterOptions),
  )
  create(
    @Body() dto: CreateProjectDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.projectsService.create(dto, files ?? []);
  }

  // ─── PATCH /projects/:id — ADMIN only ────────────────────────────────────

  /**
   * Updates project fields and/or appends new images.
   * New files are added to the project's media list.
   * To remove individual images use DELETE /projects/:id/media/:mediaId.
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FilesInterceptor('images', MAX_FILES_PER_REQUEST, projectsMulterOptions),
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.projectsService.update(id, dto, files ?? []);
  }

  // ─── DELETE /projects/:id — ADMIN only ───────────────────────────────────

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  // ─── POST /projects/:id/media — ADMIN only ────────────────────────────────

  @Post(':id/media')
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FilesInterceptor('images', MAX_FILES_PER_REQUEST, projectsMulterOptions),
  )
  addMedia(
    @Param('id') projectId: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.projectsService.addMedia(projectId, files ?? []);
  }

  // ─── DELETE /projects/:id/media/:mediaId — ADMIN only ────────────────────

  @Delete(':id/media/:mediaId')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMedia(
    @Param('id') projectId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.projectsService.removeMedia(projectId, mediaId);
  }
}
