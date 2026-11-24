import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Level, WritingType } from '@prisma/client';

export class GetPromptsDto {
  @IsOptional()
  @IsEnum(Level, { message: 'level must be a valid CEFR level' })
  level?: Level;
}

export class GetPromptsByTypeDto {
  @IsEnum(WritingType)
  type!: WritingType;

  @IsOptional()
  @IsEnum(Level)
  level?: Level;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  topic?: string;
}

export class GetTopicsDto {
  @IsEnum(WritingType)
  type!: WritingType;

  @IsOptional()
  @IsEnum(Level)
  level?: Level;
}