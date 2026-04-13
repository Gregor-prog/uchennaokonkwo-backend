import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';

import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

/**
 * Access matrix
 * ──────────────────────────────────────
 * POST /donations        Public  — open to anyone
 * GET  /donations        ADMIN   — view all records
 * GET  /donations/:id    ADMIN   — view a single record
 */
@Controller('donations')
export class DonationsController {
  constructor(private donationsService: DonationsService) {}

  // ─── POST /donations — public ─────────────────────────────────────────────

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateDonationDto) {
    return this.donationsService.create(dto);
  }

  // ─── GET /donations — admin only ──────────────────────────────────────────

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.donationsService.findAll();
  }

  // ─── GET /donations/:id — admin only ─────────────────────────────────────

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.donationsService.findOne(id);
  }
}
