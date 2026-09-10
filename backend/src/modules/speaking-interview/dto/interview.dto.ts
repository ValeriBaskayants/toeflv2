import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, MaxLength, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { Level } from '@prisma/client';

export class CreateInterviewQuestionDto {
  @IsString() @MaxLength(300)
  text!: string;

  @IsInt() @Min(0)
  orderIndex!: number;
}

export class CreateInterviewSetDto {
  @IsString() @MaxLength(200)
  topic!: string;

  @IsEnum(Level)
  level!: Level;

  @IsOptional() @IsString()
  voiceId?: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateInterviewQuestionDto)
  @ArrayMinSize(4) @ArrayMaxSize(4) // ровно 4 — как на реальном тесте
  questions!: CreateInterviewQuestionDto[];
}

export class BulkCreateInterviewDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateInterviewSetDto)
  sets!: CreateInterviewSetDto[];
}

export class GetInterviewSetsDto {
  @IsOptional() @IsEnum(Level)
  level?: Level;
}