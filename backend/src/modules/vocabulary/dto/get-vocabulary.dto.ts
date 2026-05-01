import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Level, PartOfSpeech } from '@prisma/client';

export class GetVocabularyDto {
  @IsOptional()
  @IsEnum(Level)
  level?: Level;

  @IsOptional()
  @IsEnum(PartOfSpeech)
  type?: PartOfSpeech;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class GetFlashcardsDto {
  @IsOptional()
  @IsEnum(Level)
  level?: Level;

  @IsOptional()
  @IsEnum(PartOfSpeech)
  type?: PartOfSpeech;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}