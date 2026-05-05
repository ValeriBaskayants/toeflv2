// ════════════════════════════════════════════════════════════════════════════
// backend/src/modules/listening/dto/bulk-create-listening.dto.ts
// ════════════════════════════════════════════════════════════════════════════

import {
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Level, ListeningMode, ListeningType } from '@prisma/client';

class ListeningSegmentDto {
  @IsInt()
  @Min(0)
  index!: number;

  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsNumber()
  @Min(0)
  startSec!: number;

  @IsNumber()
  @Min(0)
  endSec!: number;

  @IsOptional()
  @IsString()
  speaker?: string;
}

class CreateListeningQuestionDto {
  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsArray()
  @IsString({ each: true })
  options!: string[];

  @IsInt()
  @Min(0)
  correctIndex!: number;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  referenceStartSec?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  referenceEndSec?: number;
}

export class CreateListeningMaterialDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(100)
  topic!: string;

  @IsEnum(Level)
  level!: Level;

  @IsEnum(ListeningType)
  type!: ListeningType;

  @IsString()
  @IsNotEmpty()
  fullText!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListeningSegmentDto)
  segments!: ListeningSegmentDto[];

  // Optional overrides — defaults are derived from level in the service
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(2.0)
  speakerRate?: number;

  @IsOptional()
  @IsString()
  speakerLang?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  speakerPitch?: number;

  @IsArray()
  @IsEnum(ListeningMode, { each: true })
  allowedModes!: ListeningMode[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateListeningQuestionDto)
  questions?: CreateListeningQuestionDto[];
}

export class BulkCreateListeningDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateListeningMaterialDto)
  items!: CreateListeningMaterialDto[];
}