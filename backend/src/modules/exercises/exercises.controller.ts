import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsEnum, IsOptional } from 'class-validator';
import { Level } from '@prisma/client';
import { ExercisesService } from './exercises.service';
import { GetExercisesDto } from './dto/get-exercises.dto';
import { BulkCreateExercisesDto } from './dto/bulk-create-exercise.dto';
import { SubmitExerciseDto } from './dto/submit-exercise.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

class GetTopicsDto {
  @IsOptional()
  @IsEnum(Level)
  level?: Level;
}

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly service: ExercisesService) {}

  // GET /api/exercises?level=A1&difficulty=EASY&topic=Present+Simple
  // userId из JWT — для userStatus обогащения
  @Get()
  findAll(@CurrentUser() user: JwtUserPayload, @Query() query: GetExercisesDto) {
    return this.service.findAll({ ...query, userId: user.id });
  }

  // GET /api/exercises/topics?level=B1
  @Get('topics')
  getTopics(@Query() query: GetTopicsDto) {
    return this.service.getTopics(query.level);
  }

  // POST /api/exercises/submit
  @Post('submit')
  submitAnswer(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: SubmitExerciseDto,
    @Query('timezone') timezone?: string,
  ) {
    return this.service.submitAnswer(user.id, dto, timezone);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreate(@Body() dto: BulkCreateExercisesDto) {
    return this.service.bulkCreate(dto.exercises);
  }
}
