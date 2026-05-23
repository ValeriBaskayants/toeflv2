import { IsInt, Min, Max } from 'class-validator';
import { MAX_QUESTIONS } from 'src/constants/placement-constants';

export class AnswerPlacementDto {
  @IsInt()
  @Min(0)
  @Max(MAX_QUESTIONS - 1)
  questionIndex!: number;

  @IsInt()
  @Min(0)
  @Max(3)
  selectedIndex!: number;
}
