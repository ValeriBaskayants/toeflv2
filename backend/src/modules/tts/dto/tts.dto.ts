import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class TtsRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text!: string;

  @IsString()
  @IsNotEmpty()
  materialId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0.25)
  @Max(4.0)
  rate?: number;

  @IsOptional()
  @IsString()
  lang?: string;
}