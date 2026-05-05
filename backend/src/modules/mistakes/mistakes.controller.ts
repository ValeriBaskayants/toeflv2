import { Controller, Get, Query } from '@nestjs/common';
import { IsEnum, IsOptional } from 'class-validator';
import { MistakeSource } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { MistakesService } from './mistakes.service';
 
class GetMistakesDto {
  @IsOptional()
  @IsEnum(MistakeSource)
  source?: MistakeSource;
}
 
@Controller('mistakes')
export class MistakesController {
  constructor(private readonly mistakesService: MistakesService) {}
 
  // GET /api/mistakes?source=QUIZ
  @Get()
  findAll(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: GetMistakesDto,
  ) {
    return this.mistakesService.findAll(user.id, query.source);
  }
 
  // GET /api/mistakes/weak-spots
  @Get('weak-spots')
  getWeakSpots(@CurrentUser() user: JwtUserPayload) {
    return this.mistakesService.getWeakSpots(user.id);
  }
}