import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Level } from '@prisma/client';

class ExampleDto {
  @IsString()
  sentence!: string;

  @IsOptional()
  @IsString()
  translation?: string;
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
}

export class BulkCreateGrammarRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGrammarRuleDto)
  rules!: CreateGrammarRuleDto[];
}