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

export class StartSessionDto {
  @IsMongoId()
  materialId!: string;

  @IsEnum(ListeningMode)
  mode!: ListeningMode;
}

export class ListeningNoteDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

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
  createdAt!: string;
}

export class SaveNotesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListeningNoteDto)
  notes!: ListeningNoteDto[];
}

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
