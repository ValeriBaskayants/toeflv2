import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsEnum, IsOptional } from 'class-validator';
import { Level } from '@prisma/client';
import { ExercisesService } from './exercises.service';
import { GetExercisesDto } from './dto/get-exercises.dto';
import { BulkCreateExercisesDto } from './dto/bulk-create-exercise.dto';
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
 
  @Get()
  findAll(@Query() query: GetExercisesDto) {
    return this.service.findAll(query);
  }
 
  @Get('topics')
  getTopics(@Query() query: GetTopicsDto) {
    return this.service.getTopics(query.level);
  }
 
  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreate(@Body() dto: BulkCreateExercisesDto) {
    return this.service.bulkCreate(dto.exercises);
  }
}