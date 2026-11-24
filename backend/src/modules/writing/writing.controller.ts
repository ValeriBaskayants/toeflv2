import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString } from 'class-validator';
import { WritingService } from './writing.service';
import { GetPromptsDto, GetPromptsByTypeDto, GetTopicsDto } from './dto/get-prompts.dto';
import { StartWritingSessionDto, SubmitWritingSessionDto } from './dto/writing-session.dto';
import { BulkCreatePromptsDto } from './dto/bulk-create-prompts.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

class GetSubmissionsDto {
  @IsOptional() @IsString() promptId?: string;
}

@Controller('writing')
export class WritingController {
  constructor(private readonly service: WritingService) { }

  @Get('prompts')
  getPrompts(@CurrentUser() user: JwtUserPayload, @Query() query: GetPromptsDto) {
    return this.service.getPrompts(user.id, query.level);
  }

  @Get('prompts/by-type')
  getPromptsByType(@Query() query: GetPromptsByTypeDto) {
    return this.service.getPromptsByTypeAndTopic(query.type, query.level, query.topic);
  }

  @Get('topics')
  getAvailableTopics(@Query() query: GetTopicsDto) {
    return this.service.getAvailableTopics(query.type, query.level);
  }

  @Get('prompts/:id')
  getPrompt(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.service.getPromptById(id, user.id);
  }

  @Get('stats')
  getUserStats(@CurrentUser() user: JwtUserPayload) {
    return this.service.getUserStats(user.id);
  }

  @Post('sessions')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  startSession(@CurrentUser() user: JwtUserPayload, @Body() dto: StartWritingSessionDto) {
    return this.service.startSession(user.id, dto.promptId);
  }

  // Отдельные кнопки — Email и Academic Discussion никогда не объединяются в одну задачу
  @Post('toefl-mode/email/start')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  startToeflEmail(@CurrentUser() user: JwtUserPayload) {
    return this.service.startToeflEmailSession(user.id);
  }

  @Post('toefl-mode/discussion/start')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  startToeflDiscussion(@CurrentUser() user: JwtUserPayload) {
    return this.service.startToeflDiscussionSession(user.id);
  }

  @Post('sessions/submit')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  submitSession(@CurrentUser() user: JwtUserPayload, @Body() dto: SubmitWritingSessionDto) {
    return this.service.submitSession(user.id, dto.sessionId, dto.text);
  }

  @Get('submissions')
  getSubmissions(@CurrentUser() user: JwtUserPayload, @Query() query: GetSubmissionsDto) {
    return this.service.getSubmissions(user.id, query.promptId);
  }

  @Get('submissions/:id')
  getSubmission(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.service.getSubmission(id, user.id);
  }

  @Post('prompts/bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreatePrompts(@Body() dto: BulkCreatePromptsDto) {
    return this.service.bulkCreatePrompts(dto.prompts);
  }
}