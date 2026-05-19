import { IsArray, IsMongoId, IsString } from 'class-validator';

export class SubmitExerciseDto {
  @IsMongoId()
  exerciseId!: string;

  @IsArray()
  @IsString({ each: true })
  answers!: string[];
}
