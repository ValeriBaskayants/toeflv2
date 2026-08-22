import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpeakingRepeatService } from './speaking-repeat.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Level } from '@prisma/client';
import { IsEnum } from 'class-validator';

class GetSetsDto {
  @IsEnum(Level)
  level!: Level;
}

const MAX_AUDIO_BYTES = 5 * 1024 * 1024; 

@Controller('speaking-repeat')
export class SpeakingRepeatController {
  constructor(private readonly service: SpeakingRepeatService) {}

  @Get('sets/:level')
  findSets(@Param('level') level: Level) {
    return this.service.findSetsForLevel(level);
  }

  @Post('sessions/:setId/start')
  startSession(@CurrentUser() user: JwtUserPayload, @Param('setId') setId: string) {
    return this.service.startSession(user.id, setId);
  }

  @Get('sets/:setId/items/:itemId/audio')
  getItemAudio(@Param('setId') setId: string, @Param('itemId') itemId: string) {
    return this.service.getItemAudio(setId, itemId);
  }

  @Post('sessions/:sessionId/items/:itemId/answer')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: MAX_AUDIO_BYTES } }))
  submitAttempt(
    @CurrentUser() user: JwtUserPayload,
    @Param('sessionId') sessionId: string,
    @Param('itemId') itemId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.submitAttempt(user.id, sessionId, itemId, file.buffer, file.mimetype);
  }

  @Post('sessions/:sessionId/complete')
  completeSession(@CurrentUser() user: JwtUserPayload, @Param('sessionId') sessionId: string) {
    return this.service.completeSession(user.id, sessionId);
  }

  @Get('sessions/:sessionId/review')
  getReview(@CurrentUser() user: JwtUserPayload, @Param('sessionId') sessionId: string) {
    return this.service.getSessionReview(user.id, sessionId);
  }
}