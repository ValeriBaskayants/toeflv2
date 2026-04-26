import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Level } from '@prisma/client';

export class GetReadingsDto {
  @IsOptional()
  @IsEnum(Level, {
    message: 'level must be a valid CEFR level (A1, A1_PLUS, A2, …)',
  })
  level?: Level;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  topic?: string;
}
