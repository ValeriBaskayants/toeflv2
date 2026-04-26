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
import { Difficulty, Level } from '@prisma/client';

class BlankDto {
  @IsInt()
  @Min(0)
  position!: number;

  @IsString()
  answer!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}

export class CreateExerciseDto {
  @IsString()
  @MaxLength(100)
  topic!: string;

  @IsEnum(Level)
  level!: Level;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @IsString()
  sentence!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlankDto)
  blanks!: BlankDto[];

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class BulkCreateExercisesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExerciseDto)
  exercises!: CreateExerciseDto[];
}
