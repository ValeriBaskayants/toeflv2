import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
  Validate,
  type ValidationArguments,
  type ValidatorConstraintInterface,
  ValidatorConstraint,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Level, WritingType } from '@prisma/client';

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

class DiscussionPeerResponseDto {
  @IsString()
  @MaxLength(50)
  authorName!: string;

  @IsString()
  @MaxLength(1000)
  text!: string;
}

export class CreateWritingPromptDto {
  // Build a Sentence живёт в Scramble — сюда можно создавать только эти два типа.
  @IsIn(['EMAIL', 'ACADEMIC_DISCUSSION'])
  type!: Extract<WritingType, 'EMAIL' | 'ACADEMIC_DISCUSSION'>;

  @IsString()
  @MaxLength(2000)
  prompt!: string;

  @IsIn(['A1', 'A1_PLUS', 'A2', 'A2_PLUS', 'B1', 'B1_PLUS', 'B2', 'B2_PLUS', 'C1', 'C2'])
  level!: Level;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiscussionPeerResponseDto)
  discussionPeerResponses?: DiscussionPeerResponseDto[];

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
  @IsInt()
  @Min(60)
  timeLimitSec?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  topic?: string;
}

export class BulkCreatePromptsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWritingPromptDto)
  prompts!: CreateWritingPromptDto[];
}