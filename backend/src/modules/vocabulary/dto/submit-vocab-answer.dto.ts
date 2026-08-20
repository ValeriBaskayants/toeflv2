import { IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SubmitVocabAnswerDto {
  @IsMongoId()
  wordId!: string;

  @IsIn(['MCQ', 'CLOZE'])
  type!: 'MCQ' | 'CLOZE';

  @IsOptional()
  @IsMongoId()
  selectedId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  answerText?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  hintsUsed?: number;
}
