import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PlacementSectionType } from '@prisma/client';
import { PlacementService } from './placement.service';
import { AnswerPlacementDto } from './dto/placement.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';

const MAX_SPEAKING_AUDIO_BYTES = 5 * 1024 * 1024;

@Controller('placement')
export class PlacementController {
  constructor(private readonly placementService: PlacementService) {}

  @Get('status')
  getStatus(@CurrentUser() user: JwtUserPayload) {
    return this.placementService.getStatus(user.id);
  }

  @Get('result')
  getResultCard(@CurrentUser() user: JwtUserPayload) {
    return this.placementService.getResultCard(user.id);
  }

  @Post('start')
  @HttpCode(HttpStatus.OK)
  start(@CurrentUser() user: JwtUserPayload) {
    return this.placementService.start(user.id);
  }

  @Post('sections/:section/start')
  @HttpCode(HttpStatus.OK)
  startSection(
    @CurrentUser() user: JwtUserPayload,
    @Param('section') section: PlacementSectionType,
  ) {
    return this.placementService.startSection(user.id, section);
  }

  @Post('sections/:section/answer')
  @HttpCode(HttpStatus.OK)
  answerSection(
    @CurrentUser() user: JwtUserPayload,
    @Param('section') section: PlacementSectionType,
    @Body() dto: AnswerPlacementDto,
  ) {
    return this.placementService.answerSection(user.id, section, dto);
  }

  @Post('sections/speaking/items/:itemId/answer')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: MAX_SPEAKING_AUDIO_BYTES } }))
  submitSpeaking(
    @CurrentUser() user: JwtUserPayload,
    @Param('itemId') itemId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.placementService.submitSpeakingAttempt(user.id, itemId, file.buffer);
  }

  @Post('skip')
  @HttpCode(HttpStatus.OK)
  skip(@CurrentUser() user: JwtUserPayload) {
    return this.placementService.skip(user.id);
  }

  @Post('remind-later')
  @HttpCode(HttpStatus.OK)
  remindLater(@CurrentUser() user: JwtUserPayload) {
    return this.placementService.remindLater(user.id);
  }
}
