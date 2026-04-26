import { IsEnum, IsOptional } from 'class-validator';
import { Level } from '@prisma/client'; 

export class GetGrammarRulesDto {
  @IsOptional()
  @IsEnum(Level, { 
    message: 'Level must be a valid CEFR level (e.g., A1, A2_PLUS, B1, etc.)' 
  })
  level?: Level;
}