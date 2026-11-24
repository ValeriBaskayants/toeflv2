import { ArrayMinSize, IsArray, IsInt, IsMongoId, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReadingAnswerDto {
  @IsInt() @Min(0)
  questionIdx!: number;

  @IsInt() @Min(0)
  selectedOptionIdx!: number;
}

export class SubmitReadingDto {
  @IsMongoId()
  materialId!: string;

  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ReadingAnswerDto)
  answers!: ReadingAnswerDto[];
}