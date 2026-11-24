import {
  BadRequestException,
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
import { SpeakingInterviewService } from './speaking-interview.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BulkCreateInterviewDto, GetInterviewSetsDto } from './dto/interview.dto';
import { MAX_INTERVIEW_UPLOAD_BYTES, isAllowedAudioMime, normalizeAudioMime } from '../../constants/speaking-constants';

@Controller('speaking-interview')
export class SpeakingInterviewController {
  constructor(private readonly service: SpeakingInterviewService) {}

  @Get()
  findAll(@Query() query: GetInterviewSetsDto) {
    return this.service.findAll(query);
  }

  // Кнопка TOEFL Take an Interview — без выбора уровня и набора.
  @Post('toefl-mode/start')
  startToeflMode(@CurrentUser() user: JwtUserPayload) {
    return this.service.startToeflModeSession(user.id);
  }

  @Post('sets/:id/start')
  startSession(@CurrentUser() user: JwtUserPayload, @Param('id') setId: string) {
    return this.service.startSession(user.id, setId);
  }

  @Get('sessions/:sessionId/questions/:questionId/audio')
  getQuestionAudio(
    @CurrentUser() user: JwtUserPayload,
    @Param('sessionId') sessionId: string,
    @Param('questionId') questionId: string,
  ) {
    return this.service.getQuestionAudio(user.id, sessionId, questionId);
  }

  @Post('sessions/:sessionId/questions/:questionId/answer')
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: MAX_INTERVIEW_UPLOAD_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!isAllowedAudioMime(file.mimetype)) {
          cb(new BadRequestException('Unsupported audio format'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  submitAnswer(
    @CurrentUser() user: JwtUserPayload,
    @Param('sessionId') sessionId: string,
    @Param('questionId') questionId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file || file.buffer.length === 0) {
      throw new BadRequestException('Audio recording is required.');
    }
    return this.service.submitAnswer(user.id, sessionId, questionId, file.buffer, normalizeAudioMime(file.mimetype));
  }

  @Post('sessions/:sessionId/complete')
  completeSession(@CurrentUser() user: JwtUserPayload, @Param('sessionId') sessionId: string) {
    return this.service.completeSession(user.id, sessionId);
  }

  @Post('sessions/:sessionId/expire')
  expireSession(@CurrentUser() user: JwtUserPayload, @Param('sessionId') sessionId: string) {
    return this.service.expireSession(user.id, sessionId);
  }

  @Get('sessions/:sessionId/review')
  getReview(@CurrentUser() user: JwtUserPayload, @Param('sessionId') sessionId: string) {
    return this.service.getSessionReview(user.id, sessionId);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreate(@Body() dto: BulkCreateInterviewDto) {
    return this.service.bulkCreate(dto.sets);
  }
}