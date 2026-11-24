import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ListeningService } from './listening.service';
import { GetListeningDto, GetListeningSessionsDto } from './dto/get-listening.dto';
import { StartSessionDto, SubmitAnswerDto, SaveNotesDto } from './dto/session.dto';
import { BulkCreateListeningDto } from './dto/bulk-create-listening.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('listening')
export class ListeningController {
  constructor(private readonly service: ListeningService) {}

  @Get()
  findAll(@CurrentUser() user: JwtUserPayload, @Query() query: GetListeningDto) {
    return this.service.findAll({ ...query, userId: user.id });
  }

  @Get(':id')
  findById(@Param('id') id: string, @CurrentUser() user: JwtUserPayload) {
    return this.service.findById(id, user.id);
  }

  @Post('sessions')
  startSession(@CurrentUser() user: JwtUserPayload, @Body() dto: StartSessionDto) {
    return this.service.startSession(user.id, dto);
  }

  @Post('toefl-mode/choose-response/start')
  startToeflChooseResponse(@CurrentUser() user: JwtUserPayload) {
    return this.service.startToeflChooseResponseSession(user.id);
  }

  @Post('toefl-mode/conversation/start')
  startToeflConversation(@CurrentUser() user: JwtUserPayload) {
    return this.service.startToeflConversationSession(user.id);
  }

  @Post('toefl-mode/announcement/start')
  startToeflAnnouncement(@CurrentUser() user: JwtUserPayload) {
    return this.service.startToeflAnnouncementSession(user.id);
  }

  @Post('toefl-mode/academic-talk/start')
  startToeflAcademicTalk(@CurrentUser() user: JwtUserPayload) {
    return this.service.startToeflAcademicTalkSession(user.id);
  }

  @Get('sessions/:id/audio')
  getSessionAudio(@CurrentUser() user: JwtUserPayload, @Param('id') sessionId: string) {
    return this.service.getSessionAudio(user.id, sessionId);
  }

  @Patch('sessions/:id/notes')
  saveNotes(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') sessionId: string,
    @Body() dto: SaveNotesDto,
  ) {
    return this.service.saveNotes(user.id, sessionId, dto);
  }

  @Post('sessions/:id/answers')
  submitAnswer(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') sessionId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.service.submitAnswer(user.id, sessionId, dto);
  }

  @Post('sessions/:id/expire')
  expireSession(@CurrentUser() user: JwtUserPayload, @Param('id') sessionId: string) {
    return this.service.expireSession(user.id, sessionId);
  }

  @Post('sessions/:id/complete')
  completeSession(@CurrentUser() user: JwtUserPayload, @Param('id') sessionId: string) {
    return this.service.completeSession(user.id, sessionId);
  }

  @Get('sessions')
  getUserSessions(@CurrentUser() user: JwtUserPayload, @Query() query: GetListeningSessionsDto) {
    return this.service.getUserSessions(user.id, query.materialId);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreate(@Body() dto: BulkCreateListeningDto) {
    return this.service.bulkCreate(dto.items);
  }
}