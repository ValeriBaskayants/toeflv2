import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Level, WritingType } from '@prisma/client';
import {
  Validate,
  type ValidationArguments,
  type ValidatorConstraintInterface,
  ValidatorConstraint,
} from 'class-validator';

@ValidatorConstraint({ name: 'maxWordsAfterMinWords', async: false })
class MaxWordsAfterMinWordsConstraint implements ValidatorConstraintInterface {
  validate(maxWords: number | undefined, args?: ValidationArguments): boolean {
    const { minWords } = (args?.object ?? {}) as CreateWritingPromptDto;
    if (maxWords === undefined || minWords === undefined) return true;
    return maxWords > minWords;
  }

  defaultMessage(): string {
    return 'maxWords must be greater than minWords';
  }
}

export class CreateWritingPromptDto {
  @IsString()
  @MaxLength(2000)
  prompt!: string;

  @IsEnum(Level)
  level!: Level;

  @IsOptional()
  @IsEnum(WritingType)
  type?: WritingType;

  @IsOptional()
  @IsInt()
  @Min(10)
  minWords?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Validate(MaxWordsAfterMinWordsConstraint)
  maxWords?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;
}

export class BulkCreatePromptsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWritingPromptDto)
  prompts!: CreateWritingPromptDto[];
}