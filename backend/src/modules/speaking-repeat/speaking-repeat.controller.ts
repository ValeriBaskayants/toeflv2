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
import { SpeakingRepeatService } from './speaking-repeat.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OptionalLevelQueryDto } from '../../common/dto/optional-level-query.dto';
import { BulkCreateSpeakingRepeatDto, GetSpeakingSetsDto } from './dto/speaking-repeat.dto';
import { MAX_REPEAT_UPLOAD_BYTES, isAllowedAudioMime, normalizeAudioMime } from '../../constants/speaking-constants';

@Controller('speaking-repeat')
export class SpeakingRepeatController {
  constructor(private readonly service: SpeakingRepeatService) {}

  @Get()
  findAll(@CurrentUser() user: JwtUserPayload, @Query() query: GetSpeakingSetsDto) {
    return this.service.findAll(query, user.id);
  }

  @Get('scenarios')
  getScenarios(@Query() query: OptionalLevelQueryDto) {
    return this.service.getScenarios(query.level);
  }

  
  @Post('toefl-mode/start')
  startToeflMode(@CurrentUser() user: JwtUserPayload) {
    return this.service.startToeflModeSession(user.id);
  }

  @Get('sets/:id')
  findSetById(@Param('id') id: string) {
    return this.service.findSetById(id);
  }

  @Post('sets/:id/start')
  startSession(@CurrentUser() user: JwtUserPayload, @Param('id') setId: string) {
    return this.service.startSession(user.id, setId);
  }

  @Get('sessions/:sessionId/items/:itemId/audio')
  getItemAudio(
    @CurrentUser() user: JwtUserPayload,
    @Param('sessionId') sessionId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.getItemAudio(user.id, sessionId, itemId);
  }

  @Post('sessions/:sessionId/items/:itemId/answer')
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: MAX_REPEAT_UPLOAD_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!isAllowedAudioMime(file.mimetype)) {
          cb(new BadRequestException('Unsupported audio format'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  submitAttempt(
    @CurrentUser() user: JwtUserPayload,
    @Param('sessionId') sessionId: string,
    @Param('itemId') itemId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file || file.buffer.length === 0) {
      throw new BadRequestException('Audio recording is required.');
    }
    return this.service.submitAttempt(user.id, sessionId, itemId, file.buffer, normalizeAudioMime(file.mimetype));
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
  bulkCreate(@Body() dto: BulkCreateSpeakingRepeatDto) {
    return this.service.bulkCreate(dto.sets);
  }
}