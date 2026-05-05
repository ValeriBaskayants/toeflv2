import { IsIn, IsInt, IsString, Max, Min } from 'class-validator';
import type { SM2Quality } from '../vocabulary.service';

export class ReviewWordDto {
  @IsString()
  wordId!: string;

  @IsInt()
  @Min(0)
  @Max(5)  // ← было Max(3)
  quality!: SM2Quality;
}