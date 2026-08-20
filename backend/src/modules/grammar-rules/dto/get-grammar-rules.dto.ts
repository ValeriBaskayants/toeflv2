import { IsEnum, IsOptional } from 'class-validator';
import { Level, GrammarTier } from '@prisma/client';

export class GetGrammarRulesDto {
  @IsOptional()
  @IsEnum(Level, {
    message: 'Level must be a valid CEFR level (e.g., A1, A2_PLUS, B1, etc.)',
  })
  level?: Level;

  @IsOptional()
  @IsEnum(GrammarTier, {
    message: 'Tier must be FOUNDATION or ADVANCED',
  })
  tier?: GrammarTier;
}