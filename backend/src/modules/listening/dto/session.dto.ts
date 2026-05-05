// ════════════════════════════════════════════════════════════════════════════
// backend/src/modules/listening/dto/session.dto.ts
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
import { ListeningMode } from '@prisma/client';

// ── Start session ──────────────────────────────────────────────────────────

export class StartSessionDto {
  @IsMongoId()
  materialId!: string;

  @IsEnum(ListeningMode)
  mode!: ListeningMode;
}

// ── Record a play ──────────────────────────────────────────────────────────
// No body — sessionId comes from the URL param.

// ── Notes ─────────────────────────────────────────────────────────────────

export class ListeningNoteDto {
  @IsString()
  @IsNotEmpty()
  id!: string; // client-generated uuid

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  anchorSec?: number;

  @IsString()
  @IsNotEmpty()
  createdAt!: string; // ISO string
}

export class SaveNotesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListeningNoteDto)
  notes!: ListeningNoteDto[];
}

// ── Submit answer ──────────────────────────────────────────────────────────

export class SubmitAnswerDto {
  @IsMongoId()
  questionId!: string;

  @IsInt()
  @Min(0)
  @Max(9)
  selectedIndex!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentAudioSec?: number;
}