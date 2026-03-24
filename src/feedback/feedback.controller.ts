import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';

import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

/**
 * Access matrix
 * ─────────────────────────────────
 * POST /feedback          Public  — anyone can submit
 * GET  /feedback          ADMIN   — view all submissions
 * GET  /feedback/:id      ADMIN   — view a single submission
 */
@Controller('feedback')
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  // ─── POST /feedback — open endpoint ───────────────────────────────────────

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(dto);
  }

  // ─── GET /feedback — admin only ───────────────────────────────────────────

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.feedbackService.findAll();
  }

  // ─── GET /feedback/:id — admin only ──────────────────────────────────────

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.feedbackService.findOne(id);
  }
}
