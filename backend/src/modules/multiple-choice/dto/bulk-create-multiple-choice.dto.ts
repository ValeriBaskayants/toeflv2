



import {
  IsArray, IsBoolean, IsEnum, IsInt, IsNumber,
  IsOptional, IsString, MaxLength, Min, Max,
  ValidateNested, ArrayMinSize, ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Difficulty, Level } from '@prisma/client';

export class CreateMultipleChoiceDto {
  @IsString() @MaxLength(500)
  question!: string;

  @IsArray() @ArrayMinSize(2) @ArrayMaxSize(6)
  @IsString({ each: true }) @MaxLength(300, { each: true })
  options!: string[];

  @IsInt() @Min(0)
  correctIndex!: number;

  @IsOptional() @IsString() @MaxLength(1000)
  explanation?: string;

  @IsOptional() @IsString() @MaxLength(100)
  topic?: string;

  @IsEnum(Level)
  level!: Level;

  @IsOptional() @IsEnum(Difficulty)
  difficulty?: Difficulty;

  
  @IsOptional() @IsArray() @IsString({ each: true })
  topicSlugs?: string[];

  
  
  @IsOptional() @IsBoolean()
  isAvailableForPlacement?: boolean;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsNumber()
  difficultyRating?: number;

  @IsOptional() @IsNumber()
  discriminationRating?: number;
}

export class BulkCreateMultipleChoiceDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateMultipleChoiceDto)
  items!: CreateMultipleChoiceDto[];
}