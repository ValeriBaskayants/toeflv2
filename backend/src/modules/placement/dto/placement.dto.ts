import { IsInt, Min, Max } from 'class-validator';

export class AnswerPlacementDto {
  @IsInt()
  @Min(0)
  @Max(34)
  questionIndex!: number;

  @IsInt()
  @Min(0)
  @Max(3)
  selectedIndex!: number;
}
