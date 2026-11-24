import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DeepPracticeService } from './deep-practice.service';
import { BulkCreateTopicsDto, GetTopicsDto, StartEntryDto, MarkFinishedDto, SubmitEntryDto } from './dto/deep-practice.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('deep-practice')
export class DeepPracticeController {
  constructor(private readonly service: DeepPracticeService) {}

  @Get('topics')
  getTopics(@Query() query: GetTopicsDto) {
    return this.service.getTopics(query);
  }

  @Post('topics/bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreateTopics(@Body() dto: BulkCreateTopicsDto) {
    return this.service.bulkCreateTopics(dto.topics);
  }

  @Post('entries/start')
  startEntry(@CurrentUser() user: JwtUserPayload, @Body() dto: StartEntryDto) {
    return this.service.startEntry(user.id, dto.topicId);
  }

  @Post('entries/mark-finished')
  markTextFinished(@CurrentUser() user: JwtUserPayload, @Body() dto: MarkFinishedDto) {
    return this.service.markTextFinished(user.id, dto.entryId, dto.text);
  }


  @Get('entries')
  getUserEntries(@CurrentUser() user: JwtUserPayload) {
    return this.service.getUserEntries(user.id);
  }

  @Get('entries/:id')
  getEntry(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.service.getEntry(user.id, id);
  }
}