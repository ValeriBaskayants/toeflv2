import { IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitWritingDto {
  @IsString()
  promptId!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  text!: string;
}