import { IsEnum, IsOptional } from 'class-validator';
import { Level } from '@prisma/client';

export class GetPromptsDto {
  @IsOptional()
  @IsEnum(Level, {
    message: 'level must be a valid CEFR level',
  })
  level?: Level;
}