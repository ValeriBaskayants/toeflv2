import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsMongoId, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AcademicQuestionType, AcademicSubject, Level } from '@prisma/client';
import { TaskFilterDto } from '../../../common/dto/task-filter.dto';
import { ACADEMIC_PASSAGE_QUESTIONS, MC_OPTIONS_COUNT } from '../../../constants/reading-toefl-constants';

// INSERT_SENTENCE / SENTENCE_SIMPLIFICATION are rejected for NEW content by validateAcademicPassage() (pre-2026 types).
class AcademicQuestionInputDto {
  @IsEnum(AcademicQuestionType)
  type!: AcademicQuestionType;

  @IsString() @MaxLength(500)
  text!: string;

  @IsOptional() @IsString() @MaxLength(500)
  explanation?: string;

  @IsArray() @ArrayMinSize(MC_OPTIONS_COUNT) @ArrayMaxSize(MC_OPTIONS_COUNT) @IsString({ each: true })
  options!: string[];

  @IsInt() @Min(0) @Max(MC_OPTIONS_COUNT - 1)
  correctIndex!: number;
}

export class CreateAcademicPassageDto {
  @IsEnum(Level)
  level!: Level;

  @IsString() @MaxLength(100)
  topic!: string;

  @IsOptional() @IsEnum(AcademicSubject)
  subject?: AcademicSubject;

  @IsOptional() @IsArray() @IsString({ each: true })
  grammarTopics?: string[];

  @IsString() @MaxLength(200)
  title!: string;

  @IsString() @MaxLength(2500)
  passage!: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => AcademicQuestionInputDto)
  @ArrayMinSize(ACADEMIC_PASSAGE_QUESTIONS) @ArrayMaxSize(ACADEMIC_PASSAGE_QUESTIONS)
  questions!: AcademicQuestionInputDto[];
}

export class BulkCreateAcademicPassageDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateAcademicPassageDto)
  @ArrayMinSize(1) @ArrayMaxSize(50)
  items!: CreateAcademicPassageDto[];
}

export class GetAcademicPassageDto extends TaskFilterDto {
  @IsOptional() @IsEnum(AcademicSubject)
  subject?: AcademicSubject;
}

class AcademicAnswerInputDto {
  @IsString() @IsNotEmpty()
  questionId!: string;

  @IsOptional() @IsInt() @Min(0) @Max(MC_OPTIONS_COUNT - 1)
  selectedIndex?: number;

  // LEGACY tasks only (INSERT_SENTENCE)
  @IsOptional() @IsInt() @Min(0) @Max(3)
  selectedMarkerIndex?: number;
}

export class SubmitAcademicPassageDto {
  @IsMongoId()
  sessionId!: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => AcademicAnswerInputDto)
  @ArrayMinSize(1) @ArrayMaxSize(ACADEMIC_PASSAGE_QUESTIONS)
  answers!: AcademicAnswerInputDto[];
}