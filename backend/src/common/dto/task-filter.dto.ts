import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Level } from '@prisma/client';

export class TaskFilterDto {
  @IsOptional() @IsEnum(Level)
  level?: Level;

  @IsOptional() @IsString() @MaxLength(100)
  topic?: string;

  @IsOptional() @IsString() @MaxLength(100)
  topicSlug?: string;
}