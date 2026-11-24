import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsMongoId, IsOptional, IsString, Min, MaxLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Level } from '@prisma/client';
import { COMPLETE_WORDS_BLANK_COUNT } from '../../../constants/reading-toefl-constants';

class BlankInputDto {
  @IsInt() @Min(0)
  index!: number;

  @IsString() @MaxLength(30)
  fullWord!: string;

  @IsString() @MaxLength(30)
  visiblePrefix!: string;
}

export class CreateCompleteWordsTaskDto {
  @IsEnum(Level)
  level!: Level;

  @IsOptional() @IsString() @MaxLength(100)
  topic?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  grammarTopics?: string[];

  @IsString() @MaxLength(1000)
  fullText!: string;

  @IsOptional()
  @IsArray() @ValidateNested({ each: true }) @Type(() => BlankInputDto)
  @ArrayMinSize(COMPLETE_WORDS_BLANK_COUNT) @ArrayMaxSize(COMPLETE_WORDS_BLANK_COUNT)
  blanks?: BlankInputDto[];
}

export class BulkCreateCompleteWordsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateCompleteWordsTaskDto)
  @ArrayMinSize(1) @ArrayMaxSize(100)
  items!: CreateCompleteWordsTaskDto[];
}

class BlankAnswerDto {
  @IsInt() @Min(0)
  blankIndex!: number;

  @IsString() @MaxLength(30)
  typedText!: string;
}

export class SubmitCompleteWordsDto {
  @IsMongoId()
  sessionId!: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => BlankAnswerDto)
  @ArrayMinSize(1) @ArrayMaxSize(COMPLETE_WORDS_BLANK_COUNT)
  answers!: BlankAnswerDto[];
}