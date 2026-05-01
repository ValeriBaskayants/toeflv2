import { IsIn, IsInt, IsString } from 'class-validator';

export class ReviewWordDto {
  @IsString()
  wordId!: string;

  @IsInt()
  @IsIn([0, 1, 2, 3])
  quality!: 0 | 1 | 2 | 3;
}