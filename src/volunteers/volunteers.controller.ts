import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';

import { VolunteersService } from './volunteers.service';
import { CreateVolunteerDto } from './dto/create-volunteer.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

/**
 * Access matrix
 * ─────────────────────────────────────────
 * POST /volunteers        Public  — anyone can register
 * GET  /volunteers        ADMIN   — view all records
 * GET  /volunteers/:id    ADMIN   — view a single record
 * DELETE /volunteers/:id  ADMIN   — remove a record
 */
@Controller('volunteers')
export class VolunteersController {
  constructor(private volunteersService: VolunteersService) {}

  // ─── POST /volunteers — public registration ────────────────────────────────

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateVolunteerDto) {
    return this.volunteersService.create(dto);
  }

  // ─── GET /volunteers — admin only ─────────────────────────────────────────

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.volunteersService.findAll();
  }

  // ─── GET /volunteers/:id — admin only ────────────────────────────────────

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.volunteersService.findOne(id);
  }

  // ─── DELETE /volunteers/:id — admin only ─────────────────────────────────

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.volunteersService.remove(id);
  }
}
