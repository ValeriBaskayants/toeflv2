// ════════════════════════════════════════════════════════════════════════════
// backend/src/modules/listening/listening.controller.ts
// ════════════════════════════════════════════════════════════════════════════

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ListeningService } from './listening.service';
import { GetListeningDto } from './dto/get-listening.dto';
import {
  StartSessionDto,
  SubmitAnswerDto,
  SaveNotesDto,
} from './dto/session.dto';
import { BulkCreateListeningDto } from './dto/bulk-create-listening.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

// Global JWT guard covers all routes via APP_GUARD — no @UseGuards needed here.
@Controller('listening')
export class ListeningController {
  constructor(private readonly service: ListeningService) {}

  // ── Material browser ────────────────────────────────────────────────────

  // GET /api/listening?level=B1&type=LECTURE&search=environment
  @Get()
  findAll(@Query() query: GetListeningDto) {
    return this.service.findAll(query);
  }

  // GET /api/listening/:id
  // Returns material + questions.  fullText revealed only if user has EASY session open.
  @Get(':id')
  findById(
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.service.findById(id, user.id);
  }

  // ── Session lifecycle ───────────────────────────────────────────────────

  // POST /api/listening/sessions
  @Post('sessions')
  startSession(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: StartSessionDto,
  ) {
    return this.service.startSession(user.id, dto);
  }

  // POST /api/listening/sessions/:id/play
  // Call this every time the user presses Play.
  @Post('sessions/:id/play')
  recordPlay(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') sessionId: string,
  ) {
    return this.service.recordPlay(user.id, sessionId);
  }

  // PATCH /api/listening/sessions/:id/notes
  // Replaces the full notes array (client sends complete state).
  @Patch('sessions/:id/notes')
  saveNotes(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') sessionId: string,
    @Body() dto: SaveNotesDto,
  ) {
    return this.service.saveNotes(user.id, sessionId, dto);
  }

  // POST /api/listening/sessions/:id/answers
  @Post('sessions/:id/answers')
  submitAnswer(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') sessionId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.service.submitAnswer(user.id, sessionId, dto);
  }

  // POST /api/listening/sessions/:id/complete
  // Finalises the session, computes score, updates progress.
  @Post('sessions/:id/complete')
  completeSession(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') sessionId: string,
  ) {
    return this.service.completeSession(user.id, sessionId);
  }

  // ── Session history ─────────────────────────────────────────────────────

  // GET /api/listening/sessions?materialId=...
  @Get('sessions')
  getUserSessions(
    @CurrentUser() user: JwtUserPayload,
    @Query('materialId') materialId?: string,
  ) {
    return this.service.getUserSessions(user.id, materialId);
  }

  // ── Admin ───────────────────────────────────────────────────────────────

  // POST /api/listening/bulk
  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreate(@Body() dto: BulkCreateListeningDto) {
    return this.service.bulkCreate(dto.items);
  }
}

