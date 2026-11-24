import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Level, ListeningType } from '@prisma/client';
export class GetListeningDto {
  @IsOptional()
  @IsEnum(Level, { message: 'level must be a valid CEFR level (A1, B2, …)' })
  level?: Level;

  @IsOptional()
  @IsEnum(ListeningType)
  type?: ListeningType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class GetListeningSessionsDto {
  @IsOptional()
  @Matches(/^[a-f\d]{24}$/i, { message: 'materialId must be a valid identifier' })
  materialId?: string;
}