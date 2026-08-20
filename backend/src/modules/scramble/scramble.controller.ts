


import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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
} from './dto/scramble.dto';

@Controller('scramble')
export class ScrambleController {
  constructor(private readonly service: ScrambleService) {}

  

  @Get()
  findAll(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: GetScrambleDto,
  ) {
    return this.service.findAll(query, user.id);
  }

  @Get('sessions')
  getUserSessions(
    @CurrentUser() user: JwtUserPayload,
    @Query('exerciseId') exerciseId?: string,
  ) {
    return this.service.getUserSessions(user.id, exerciseId);
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
    @Query('mode') mode?: string,
  ) {
    return this.service.findById(id, user.id, mode as any);
  }

  @Post('sessions')
  startSession(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: StartScrambleSessionDto,
  ) {
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

  

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreate(@Body() dto: BulkCreateScrambleDto) {
    return this.service.bulkCreate(dto.items);
  }
}