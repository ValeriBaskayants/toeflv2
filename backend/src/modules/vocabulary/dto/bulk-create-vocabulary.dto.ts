import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Level, PartOfSpeech } from '@prisma/client';

class WordFormsDto {
  @IsOptional()
  @IsString()
  base?: string;

  @IsOptional()
  @IsString()
  past?: string;

  @IsOptional()
  @IsString()
  pastParticiple?: string;

  @IsOptional()
  @IsString()
  thirdPerson?: string;

  @IsOptional()
  @IsString()
  presentParticiple?: string;
}

export class CreateVocabularyDto {
  @IsString()
  @MaxLength(100)
  word!: string;

  @IsEnum(Level)
  level!: Level;

  @IsOptional()
  @IsEnum(PartOfSpeech)
  type?: PartOfSpeech;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pronunciation?: string;

  @IsString()
  @MaxLength(1000)
  definition!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  definitionRu?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  examples?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  synonyms?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  antonyms?: string[];

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WordFormsDto)
  forms?: WordFormsDto;

  @IsOptional()
  @IsBoolean()
  isIrregularVerb?: boolean;
}

export class BulkCreateVocabularyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVocabularyDto)
  vocabulary!: CreateVocabularyDto[];
}