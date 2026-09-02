import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ScrambleMode } from '@prisma/client';
import { ScrambleService } from './scramble.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  BulkCreateScrambleDto,
  GetScrambleDto,
  StartScrambleSessionDto,
  SubmitScrambleDto,
  StartScrambleBlockDto,
  SubmitScrambleBlockItemDto,
} from './dto/scramble.dto';

@Controller('scramble')
export class ScrambleController {
  constructor(private readonly service: ScrambleService) { }

  @Get()
  findAll(@CurrentUser() user: JwtUserPayload, @Query() query: GetScrambleDto) {
    return this.service.findAll(query, user.id);
  }

  @Get('sessions')
  getUserSessions(@CurrentUser() user: JwtUserPayload, @Query('exerciseId') exerciseId?: string) {
    return this.service.getUserSessions(user.id, exerciseId);
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
    @Query('mode') mode?: ScrambleMode,
  ) {
    return this.service.findById(id, user.id, mode);
  }

  @Post('sessions')
  startSession(@CurrentUser() user: JwtUserPayload, @Body() dto: StartScrambleSessionDto) {
    return this.service.startSession(user.id, dto);
  }

  @Post('sessions/:id/submit')
  submitAnswer(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') sessionId: string,
    @Body() dto: SubmitScrambleDto,
  ) {
    return this.service.submitAnswer(user.id, sessionId, dto);
  }

  @Post('blocks')
  startBlock(@CurrentUser() user: JwtUserPayload, @Body() dto: StartScrambleBlockDto) {
    return this.service.startBlock(user.id, dto.level);
  }

  @Get('blocks/:id/current')
  getCurrentBlockItem(@CurrentUser() user: JwtUserPayload, @Param('id') blockId: string) {
    return this.service.getCurrentBlockItem(user.id, blockId);
  }

  @Post('blocks/:id/submit')
  submitBlockItem(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') blockId: string,
    @Body() dto: SubmitScrambleBlockItemDto,
  ) {
    return this.service.submitBlockItem(user.id, blockId, dto);
  }

  @Get('blocks/:id/review')
  getBlockReview(@CurrentUser() user: JwtUserPayload, @Param('id') blockId: string) {
    return this.service.getBlockReview(user.id, blockId);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreate(@Body() dto: BulkCreateScrambleDto) {
    return this.service.bulkCreate(dto.items);
  }

  @Post('blocks/:id/expire')
  expireBlock(@CurrentUser() user: JwtUserPayload, @Param('id') blockId: string) {
    return this.service.expireBlock(user.id, blockId);
  }
}
