import { IsArray, IsMongoId, IsString } from 'class-validator';
 
export class SubmitExerciseDto {
  @IsMongoId()
  exerciseId!: string;
 
  // One answer string per blank, in order of blank.position
  @IsArray()
  @IsString({ each: true })
  answers!: string[];
}