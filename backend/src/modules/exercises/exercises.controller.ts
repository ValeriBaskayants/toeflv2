import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { GetExercisesDto } from './dto/get-exercises.dto';
import { BulkCreateExercisesDto } from './dto/bulk-create-exercise.dto';
import { Level } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

// Helper DTO for the topics endpoint — avoids raw string from query
class GetTopicsDto {
  @IsOptional()
  @IsEnum(Level)
  level?: Level;
}

// Full path: /api/exercises (api/ prefix set globally in main.ts)
// @UseGuards(JwtAuthGuard) omitted — applied globally via APP_GUARD
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly service: ExercisesService) {}

  // GET /api/exercises?level=A1&difficulty=EASY&topic=verbs&limit=20
  @Get()
  findAll(@Query() query: GetExercisesDto) {
    return this.service.findAll(query);
  }

  // GET /api/exercises/topics?level=A1
  @Get('topics')
  getTopics(@Query() query: GetTopicsDto) {
    return this.service.getTopics(query.level);
  }

  // POST /api/exercises/bulk — admin only (TODO: @Roles('ADMIN'))
  @Post('bulk')
  bulkCreate(@Body() dto: BulkCreateExercisesDto) {
    return this.service.bulkCreate(dto.exercises);
  }
}