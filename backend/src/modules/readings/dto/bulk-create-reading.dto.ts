import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Level } from '@prisma/client';

// ── Embedded types ─────────────────────────────────────────────────────────

class VocabularyEmbeddedDto {
  @IsString()
  word!: string;

  @IsString()
  translation!: string;

  @IsOptional()
  @IsString()
  contextSentence?: string;
}

class QuestionOptionDto {
  @IsString()
  text!: string;

  @IsOptional()
  isCorrect?: boolean;
}

class QuestionEmbeddedDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options!: QuestionOptionDto[];
}

// ── Main DTO ───────────────────────────────────────────────────────────────

export class CreateReadingDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsEnum(Level)
  level!: Level;

  @IsString()
  @MaxLength(100)
  topic!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionEmbeddedDto)
  questions?: QuestionEmbeddedDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VocabularyEmbeddedDto)
  vocabulary?: VocabularyEmbeddedDto[];
}

export class BulkCreateReadingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReadingDto)
  readings!: CreateReadingDto[];
}
