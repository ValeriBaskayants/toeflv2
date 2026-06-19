import { IsString, IsNotEmpty, MaxLength, IsOptional, IsNumber, Min, Max } from 'class-validator';

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
  @Min(0.5)
  @Max(2.0)
  rate?: number;
}