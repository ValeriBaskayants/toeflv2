import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Level } from '@prisma/client';
import { SpeakingRepeatService } from './speaking-repeat.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  BulkCreateSpeakingRepeatDto,
  GetSpeakingSetsDto,
} from './dto/speaking-repeat.dto';

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

@Controller('speaking-repeat')
export class SpeakingRepeatController {
  constructor(private readonly service: SpeakingRepeatService) {}

  @Get()
  findAll(@CurrentUser() user: JwtUserPayload, @Query() query: GetSpeakingSetsDto) {
    return this.service.findAll(query, user.id);
  }

  @Get('scenarios')
  getScenarios(@Query('level') level?: Level) {
    return this.service.getScenarios(level);
  }

  @Get('sets/:id')
  findSetById(@Param('id') id: string) {
    return this.service.findSetById(id);
  }

  @Post('sets/:id/start')
  startSession(@CurrentUser() user: JwtUserPayload, @Param('id') setId: string) {
    return this.service.startSession(user.id, setId);
  }

  @Get('sessions/:sessionId/sets/:setId/items/:itemId/audio')
  getItemAudio(
    @CurrentUser() user: JwtUserPayload,
    @Param('sessionId') sessionId: string,
    @Param('setId') setId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.getItemAudio(user.id, sessionId, setId, itemId);
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

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreate(@Body() dto: BulkCreateSpeakingRepeatDto) {
    return this.service.bulkCreate(dto.sets);
  }
}
