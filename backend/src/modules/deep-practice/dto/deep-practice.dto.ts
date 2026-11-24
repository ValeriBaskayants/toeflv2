import { ArrayMaxSize, IsArray, IsEnum, IsMongoId, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Level } from '@prisma/client';

export class CreateTopicDto {
  @IsString() @MaxLength(200)
  core!: string;

  @IsString() @MaxLength(300)
  constraint!: string;

  @IsOptional() @IsEnum(Level)
  level?: Level;
}

export class BulkCreateTopicsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateTopicDto)
  topics!: CreateTopicDto[];
}

export class GetTopicsDto {
  @IsOptional() @IsEnum(Level)
  level?: Level;
}

export class StartEntryDto {
  @IsMongoId()
  topicId!: string;
}

export class MarkFinishedDto {
  @IsMongoId()
  entryId!: string;

  @IsString() @MinLength(1) @MaxLength(3000)
  text!: string;
}

export class SubmitEntryDto {
  @IsMongoId()
  entryId!: string;
}