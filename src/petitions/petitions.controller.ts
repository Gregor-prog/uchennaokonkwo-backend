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

import { PetitionsService } from './petitions.service';
import { CreatePetitionDto } from './dto/create-petition.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

/**
 * Access matrix
 * ─────────────────────────────────────────
 * POST /petitions        Public  — anyone can submit
 * GET  /petitions        ADMIN   — view all submissions
 * GET  /petitions/:id    ADMIN   — view a single submission
 * DELETE /petitions/:id  ADMIN   — remove a submission
 */
@Controller('petitions')
export class PetitionsController {
  constructor(private petitionsService: PetitionsService) {}

  // ─── POST /petitions — public submission ───────────────────────────────────

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePetitionDto) {
    return this.petitionsService.create(dto);
  }

  // ─── GET /petitions — admin only ───────────────────────────────────────────

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.petitionsService.findAll();
  }

  // ─── GET /petitions/:id — admin only ──────────────────────────────────────

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.petitionsService.findOne(id);
  }

  // ─── DELETE /petitions/:id — admin only ───────────────────────────────────

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.petitionsService.remove(id);
  }
}
