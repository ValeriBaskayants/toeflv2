import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsMongoId, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DailyLifeFormat, DailyLifeSkill, Level } from '@prisma/client';
import { TaskFilterDto } from '../../../common/dto/task-filter.dto';
import { DAILY_LIFE_MAX_QUESTIONS, DAILY_LIFE_MIN_QUESTIONS, MC_OPTIONS_COUNT } from '../../../constants/reading-toefl-constants';

class SimpleQuestionInputDto {
  @IsString() @MaxLength(500)
  text!: string;

  @IsArray() @ArrayMinSize(MC_OPTIONS_COUNT) @ArrayMaxSize(MC_OPTIONS_COUNT) @IsString({ each: true })
  options!: string[];

  // Was @Min(0) only: correctIndex 7 on a 4-option question was accepted and the item could never be answered correctly.
  @IsInt() @Min(0) @Max(MC_OPTIONS_COUNT - 1)
  correctIndex!: number;

  @IsOptional() @IsString() @MaxLength(500)
  explanation?: string;

  @IsOptional() @IsEnum(DailyLifeSkill)
  skill?: DailyLifeSkill;
}

export class CreateDailyLifeTaskDto {
  @IsEnum(Level)
  level!: Level;

  @IsOptional() @IsString() @MaxLength(100)
  topic?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  grammarTopics?: string[];

  @IsEnum(DailyLifeFormat)
  format!: DailyLifeFormat;

  @IsString() @MaxLength(1500)
  text!: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => SimpleQuestionInputDto)
  @ArrayMinSize(DAILY_LIFE_MIN_QUESTIONS) @ArrayMaxSize(DAILY_LIFE_MAX_QUESTIONS)
  questions!: SimpleQuestionInputDto[];
}

export class BulkCreateDailyLifeDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateDailyLifeTaskDto)
  @ArrayMinSize(1) @ArrayMaxSize(100)
  items!: CreateDailyLifeTaskDto[];
}

export class GetDailyLifeDto extends TaskFilterDto {
  @IsOptional() @IsEnum(DailyLifeFormat)
  format?: DailyLifeFormat;
}

class DailyLifeAnswerDto {
  @IsString() @IsNotEmpty()
  questionId!: string;

  @IsInt() @Min(0) @Max(MC_OPTIONS_COUNT - 1)
  selectedIndex!: number;
}

export class SubmitDailyLifeDto {
  @IsMongoId()
  sessionId!: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => DailyLifeAnswerDto)
  @ArrayMinSize(1) @ArrayMaxSize(DAILY_LIFE_MAX_QUESTIONS)
  answers!: DailyLifeAnswerDto[];
}