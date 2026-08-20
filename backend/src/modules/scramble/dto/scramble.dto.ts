


import {
  IsString, IsNotEmpty, IsEnum, IsArray, IsBoolean,
  IsInt, IsOptional, Min, Max, ValidateNested, MaxLength,
  ArrayMinSize, ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScrambleMode, GrammarRole, Level } from '@prisma/client';



export class ScrambleWordDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  word!: string;

  @IsEnum(GrammarRole)
  role!: GrammarRole;

  @IsInt()
  @Min(0)
  position!: number;

  @IsBoolean()
  @IsOptional()
  isDistractor?: boolean;
}

export class CreateScrambleExerciseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  sentence!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScrambleWordDto)
  @ArrayMinSize(2)
  @ArrayMaxSize(30)
  words!: ScrambleWordDto[];

  @IsEnum(Level)
  level!: Level;

  @IsString()
  @IsNotEmpty()
  topic!: string;

  @IsArray()
  @IsEnum(ScrambleMode, { each: true })
  allowedModes!: ScrambleMode[];

  @IsString()
  @IsOptional()
  @MaxLength(300)
  translation?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  explanation?: string;
}

export class BulkCreateScrambleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateScrambleExerciseDto)
  items!: CreateScrambleExerciseDto[];
}



export class GetScrambleDto {
  @IsEnum(Level)
  @IsOptional()
  level?: Level;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsEnum(ScrambleMode)
  @IsOptional()
  mode?: ScrambleMode;
}



export class StartScrambleSessionDto {
  @IsString()
  @IsNotEmpty()
  exerciseId!: string;

  @IsEnum(ScrambleMode)
  mode!: ScrambleMode;
}



export class SubmitScrambleDto {
  
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  wordOrder!: string[];

  @IsInt()
  @Min(0)
  @Max(600)
  timeSpentSec!: number;

  @IsBoolean()
  usedHint!: boolean;
}