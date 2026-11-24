import {
  IsString, IsNotEmpty, IsEnum, IsArray, IsBoolean, IsInt, IsMongoId, IsOptional, Min, Max, ValidateNested, MaxLength,
  ArrayMinSize, ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScrambleMode, GrammarRole, Level } from '@prisma/client';

export class ScrambleWordDto {
  @IsString() @IsNotEmpty() @MaxLength(60) id!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) word!: string;
  @IsEnum(GrammarRole) role!: GrammarRole;
  @IsInt() @Min(0) position!: number;
  @IsBoolean() @IsOptional() isDistractor?: boolean;
  @IsBoolean() @IsOptional() requiresUserInput?: boolean;
  // NEW: visible, non-draggable piece of the frame
  @IsBoolean() @IsOptional() isFixed?: boolean;
}

class ScrambleAlternativeDto {
  @IsArray() @IsString({ each: true }) @ArrayMinSize(2) @ArrayMaxSize(30)
  order!: string[];
}

export class CreateScrambleExerciseDto {
  /** The context sentence shown above the frame (e.g. the question being answered). Required for exam-eligible (EXPERT) items. */
  @IsString() @IsOptional() @MaxLength(300)
  prompt?: string;

  @IsString() @IsNotEmpty() @MaxLength(500)
  sentence!: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => ScrambleWordDto) @ArrayMinSize(2) @ArrayMaxSize(30)
  words!: ScrambleWordDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ScrambleAlternativeDto) @ArrayMaxSize(5)
  alternatives?: ScrambleAlternativeDto[];

  @IsEnum(Level)
  level!: Level;

  @IsString() @IsNotEmpty()
  topic!: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  topicSlugs?: string[];

  @IsArray() @IsEnum(ScrambleMode, { each: true }) @ArrayMinSize(1)
  allowedModes!: ScrambleMode[];

  @IsString() @IsOptional() @MaxLength(300)
  translation?: string;

  @IsString() @IsOptional() @MaxLength(1000)
  explanation?: string;
}

export class BulkCreateScrambleDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateScrambleExerciseDto) @ArrayMinSize(1) @ArrayMaxSize(100)
  items!: CreateScrambleExerciseDto[];
}

export class GetScrambleDto {
  @IsEnum(Level) @IsOptional()
  level?: Level;

  @IsString() @IsOptional() @MaxLength(100)
  topic?: string;

  @IsOptional() @IsString() @MaxLength(100)
  topicSlug?: string;

  @IsEnum(ScrambleMode) @IsOptional()
  mode?: ScrambleMode;
}

export class GetScrambleSessionsDto {
  @IsOptional() @IsMongoId()
  exerciseId?: string;
}

export class GetScrambleItemDto {
  @IsOptional() @IsEnum(ScrambleMode)
  mode?: ScrambleMode;
}

export class StartScrambleSessionDto {
  @IsMongoId()
  exerciseId!: string;

  @IsEnum(ScrambleMode)
  mode!: ScrambleMode;
}

export class StartPracticeSetDto {
  @IsEnum(Level)
  level!: Level;

  @IsInt() @Min(3) @Max(20)
  count!: number;
}

export class FilledBlankDto {
  @IsInt() @Min(0)
  position!: number;

  @IsString() @IsNotEmpty() @MaxLength(30)
  text!: string;
}

export class SubmitScrambleDto {
  @IsArray() @IsString({ each: true }) @ArrayMaxSize(30)
  wordOrder!: string[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => FilledBlankDto)
  filledBlanks?: FilledBlankDto[];

  /** DEPRECATED for single sessions: the server measures time itself. Still read for guided block items (no server timer there). */
  @IsOptional() @IsInt() @Min(0) @Max(600)
  timeSpentSec?: number;

  /** Hints exist only in guided practice; the real test has none. */
  @IsOptional() @IsBoolean()
  usedHint?: boolean;
}

export class SubmitScrambleBlockItemDto {
  @IsArray() @IsString({ each: true }) @ArrayMaxSize(30)
  wordOrder!: string[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => FilledBlankDto)
  filledBlanks?: FilledBlankDto[];

  @IsOptional() @IsInt() @Min(0) @Max(600)
  timeSpentSec?: number;

  @IsOptional() @IsBoolean()
  usedHint?: boolean;
}

// Draft for one item of a free-navigation block: saved many times, finalized only by finish/expire.
export class SaveScrambleDraftDto {
  @IsMongoId()
  exerciseId!: string;

  @IsArray() @IsString({ each: true }) @ArrayMaxSize(30)
  wordOrder!: string[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => FilledBlankDto)
  filledBlanks?: FilledBlankDto[];

  @IsOptional() @IsBoolean()
  usedHint?: boolean;
}