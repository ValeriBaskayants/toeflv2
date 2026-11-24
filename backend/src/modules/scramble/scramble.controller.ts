import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ScrambleService } from './scramble.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserTimezone } from '../../common/decorators/user-timezone.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  BulkCreateScrambleDto, GetScrambleDto, GetScrambleItemDto, GetScrambleSessionsDto, SaveScrambleDraftDto, StartPracticeSetDto,
  StartScrambleSessionDto, SubmitScrambleBlockItemDto, SubmitScrambleDto,
} from './dto/scramble.dto';

@Controller('scramble')
export class ScrambleController {
  constructor(private readonly service: ScrambleService) {}

  @Get()
  findAll(@CurrentUser() user: JwtUserPayload, @Query() query: GetScrambleDto) {
    return this.service.findAll(query, user.id);
  }

  @Get('sessions')
  getUserSessions(@CurrentUser() user: JwtUserPayload, @Query() query: GetScrambleSessionsDto) {
    return this.service.getUserSessions(user.id, query.exerciseId);
  }

  @Post('sessions')
  startSession(@CurrentUser() user: JwtUserPayload, @Body() dto: StartScrambleSessionDto) {
    return this.service.startSession(user.id, dto);
  }

  @Post('sessions/:id/submit')
  submitAnswer(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseObjectIdPipe) sessionId: string,
    @Body() dto: SubmitScrambleDto,
    @UserTimezone() timezone?: string,
  ) {
    return this.service.submitAnswer(user.id, sessionId, dto, timezone);
  }

  // "TOEFL experience": the official Build a Sentence task = 10 items under one timer, key-scored, no hints, no feedback until the end.
  @Post('blocks')
  startBlock(@CurrentUser() user: JwtUserPayload) {
    return this.service.startBlock(user.id);
  }

  @Post('practice-sets')
  startPracticeSet(@CurrentUser() user: JwtUserPayload, @Body() dto: StartPracticeSetDto) {
    return this.service.startPracticeSet(user.id, dto.level, dto.count);
  }

  // guided linear flow (A1-A2+)
  @Get('blocks/:id/current')
  getCurrentBlockItem(@CurrentUser() user: JwtUserPayload, @Param('id', ParseObjectIdPipe) blockId: string) {
    return this.service.getCurrentBlockItem(user.id, blockId);
  }

  @Post('blocks/:id/submit')
  submitBlockItem(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseObjectIdPipe) blockId: string,
    @Body() dto: SubmitScrambleBlockItemDto,
    @UserTimezone() timezone?: string,
  ) {
    return this.service.submitBlockItem(user.id, blockId, dto, timezone);
  }

  // free-navigation flow (B1+ practice and EXAM)
  @Get('blocks/:id/items')
  getBlockItems(@CurrentUser() user: JwtUserPayload, @Param('id', ParseObjectIdPipe) blockId: string) {
    return this.service.getBlockItems(user.id, blockId);
  }

  @Post('blocks/:id/draft')
  saveDraftAnswer(@CurrentUser() user: JwtUserPayload, @Param('id', ParseObjectIdPipe) blockId: string, @Body() dto: SaveScrambleDraftDto) {
    return this.service.saveDraftAnswer(user.id, blockId, dto);
  }

  @Post('blocks/:id/finish')
  finishBlock(@CurrentUser() user: JwtUserPayload, @Param('id', ParseObjectIdPipe) blockId: string, @UserTimezone() timezone?: string) {
    return this.service.finishBlock(user.id, blockId, timezone);
  }

  @Post('blocks/:id/expire')
  expireBlock(@CurrentUser() user: JwtUserPayload, @Param('id', ParseObjectIdPipe) blockId: string, @UserTimezone() timezone?: string) {
    return this.service.expireBlock(user.id, blockId, timezone);
  }

  @Get('blocks/:id/review')
  getBlockReview(@CurrentUser() user: JwtUserPayload, @Param('id', ParseObjectIdPipe) blockId: string) {
    return this.service.getBlockReview(user.id, blockId);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreate(@Body() dto: BulkCreateScrambleDto) {
    return this.service.bulkCreate(dto.items);
  }

  // Declared LAST: a bare ':id' would otherwise swallow 'sessions', 'blocks/...' and friends.
  @Get(':id')
  findById(@CurrentUser() user: JwtUserPayload, @Param('id', ParseObjectIdPipe) id: string, @Query() query: GetScrambleItemDto) {
    return this.service.findById(id, user.id, query.mode);
  }
}