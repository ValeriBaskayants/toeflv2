import { IsInt, Min, Max } from 'class-validator';
import { MAX_QUESTION_INDEX } from 'src/constants/placement-constants';

export class AnswerPlacementDto {
  @IsInt()
  @Min(0)
  @Max(MAX_QUESTION_INDEX)
  questionIndex!: number;

  @IsInt()
  @Min(0)
  @Max(3)
  selectedIndex!: number;
}
