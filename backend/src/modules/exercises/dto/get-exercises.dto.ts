import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Difficulty, Level } from '@prisma/client';

export class GetExercisesDto {
  @IsOptional()
  @IsEnum(Level, {
    message: 'level must be a valid CEFR level (A1, A1_PLUS, A2, …)',
  })
  level?: Level;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  topic?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // FIX: Hard limit — prevents full-table dump (Prod standard)
  limit?: number;
}