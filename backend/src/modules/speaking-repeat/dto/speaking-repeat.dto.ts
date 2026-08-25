import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Level, SpeakingDifficulty } from '@prisma/client';

export class CreateSpeakingRepeatItemDto {
  @IsString()
  @MaxLength(500)
  text!: string;

  @IsEnum(SpeakingDifficulty)
  difficulty!: SpeakingDifficulty;

  @IsInt()
  @Min(0)
  orderIndex!: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(3)
  recordingWindowSec?: number;
}

export class CreateSpeakingRepeatSetDto {
  @IsString()
  @MaxLength(200)
  scenario!: string;

  @IsEnum(Level)
  level!: Level;

  @IsOptional()
  @IsString()
  voiceId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSpeakingRepeatItemDto)
  @ArrayMinSize(3)
  @ArrayMaxSize(12)
  items!: CreateSpeakingRepeatItemDto[];
}

export class BulkCreateSpeakingRepeatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSpeakingRepeatSetDto)
  sets!: CreateSpeakingRepeatSetDto[];
}

export class GetSpeakingSetsDto {
  @IsOptional()
  @IsEnum(Level)
  level?: Level;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  scenario?: string;
}
