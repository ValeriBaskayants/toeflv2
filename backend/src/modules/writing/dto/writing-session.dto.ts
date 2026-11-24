import { IsMongoId, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class StartWritingSessionDto {
  @IsMongoId()
  promptId!: string;
}

export class SubmitWritingSessionDto {
  @IsMongoId()
  sessionId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(6000)
  text!: string;
}