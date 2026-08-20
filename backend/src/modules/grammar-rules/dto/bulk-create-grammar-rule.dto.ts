import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Level, GrammarTier } from '@prisma/client';

class ExampleDto {
  @IsString()
  sentence!: string;

  @IsOptional()
  @IsString()
  translation?: string;
}

class CrossReferenceDto {
  @IsString()
  @MaxLength(60)
  label!: string;

  @IsOptional()
  @IsString()
  targetSlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  targetAnchor?: string;
}

class UsageDto {
  @IsString()
  title!: string;

  @IsString()
  explanation!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExampleDto)
  examples!: ExampleDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2)
  letter?: string;

  @IsOptional()
  @IsString()
  register?: string;
}

class SectionDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExampleDto)
  examples!: ExampleDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2)
  letter?: string;

  @IsOptional()
  @IsString()
  register?: string;
}

class ComparisonDto {
  @IsString()
  compareWith!: string;

  @IsString()
  explanation!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExampleDto)
  examples!: ExampleDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2)
  letter?: string;
}

class PracticeTargetsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  grammarRequired?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  grammarAccuracyMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  quizRequired?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  readingRequired?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  listeningRequired?: number;
}

class TopicResourceDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(500)
  url!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateGrammarRuleDto {
  @IsString()
  @MaxLength(200)
  topic!: string;

  @IsString()
  slug!: string;

  @IsEnum(Level)
  level!: Level;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  coreConcept?: string;

  @IsOptional()
  @IsString()
  structure?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UsageDto)
  usages?: UsageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections?: SectionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComparisonDto)
  comparisons?: ComparisonDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  commonMistakes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  signalWords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedTopics?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisiteSlugs?: string[];

  @IsOptional()
  @IsBoolean()
  isCore?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => PracticeTargetsDto)
  practiceTargets?: PracticeTargetsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopicResourceDto)
  resources?: TopicResourceDto[];

  @IsOptional()
  @IsEnum(GrammarTier)
  tier?: GrammarTier;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  sourceAttribution?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrossReferenceDto)
  crossReferences?: CrossReferenceDto[];
}

export class BulkCreateGrammarRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGrammarRuleDto)
  rules!: CreateGrammarRuleDto[];
}