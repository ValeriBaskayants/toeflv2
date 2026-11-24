import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MistakeSource } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { MistakesService } from './mistakes.service';

class GetMistakesDto {
  @IsOptional()
  @IsEnum(MistakeSource)
  source?: MistakeSource;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

class GetDueDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

@Controller('mistakes')
export class MistakesController {
  constructor(private readonly mistakesService: MistakesService) {}

  @Get()
  findAll(@CurrentUser() user: JwtUserPayload, @Query() query: GetMistakesDto) {
    return this.mistakesService.findAll(user.id, query.source, query.limit);
  }

  @Get('weak-spots')
  getWeakSpots(@CurrentUser() user: JwtUserPayload) {
    return this.mistakesService.getWeakSpots(user.id);
  }

  @Get('heatmap')
  getHeatmap(@CurrentUser() user: JwtUserPayload) {
    return this.mistakesService.getHeatmapData(user.id);
  }

  @Get('due')
  getDueForReview(@CurrentUser() user: JwtUserPayload, @Query() query: GetDueDto) {
    return this.mistakesService.getDueForReview(user.id, query.limit);
  }

  @Get('due/count')
  getDueCount(@CurrentUser() user: JwtUserPayload) {
    return this.mistakesService.getDueCount(user.id);
  }

  @Get('due/tasks')
  getDueTasks(@CurrentUser() user: JwtUserPayload, @Query() query: GetDueDto) {
    return this.mistakesService.getDueTasks(user.id, query.limit);
  }

  @Patch(':id/mastered')
  markMastered(@CurrentUser() user: JwtUserPayload, @Param('id', ParseObjectIdPipe) id: string) {
    return this.mistakesService.markMastered(user.id, id);
  }
}