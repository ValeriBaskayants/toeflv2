import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsMongoId,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SubmitMCAnswerDto {
  @IsMongoId()
  questionId!: string;

  @IsInt()
  @Min(0)
  @Max(5)
  selectedIndex!: number;
}

export class SubmitMCSessionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SubmitMCAnswerDto)
  answers!: SubmitMCAnswerDto[];
}
