import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Level, WritingType } from '@prisma/client';

export class CreateWritingPromptDto {
  @IsString()
  @MaxLength(2000)
  prompt!: string;

  @IsEnum(Level)
  level!: Level;

  @IsOptional()
  @IsEnum(WritingType)
  type?: WritingType;

  @IsOptional()
  @IsInt()
  @Min(10)
  minWords?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  maxWords?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;
}

export class BulkCreatePromptsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWritingPromptDto)
  prompts!: CreateWritingPromptDto[];
}