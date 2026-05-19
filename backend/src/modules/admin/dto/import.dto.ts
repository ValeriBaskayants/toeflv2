import { IsArray, IsNotEmpty, IsOptional } from 'class-validator';

export class ImportExercisesDto {
  @IsArray()
  @IsNotEmpty()
  exercises: any[] = [];
}

export class ImportGrammarRulesDto {
  @IsArray()
  @IsNotEmpty()
  grammarRules: any[] = [];
}

export class ImportVocabularyDto {
  @IsArray()
  @IsNotEmpty()
  vocabulary: any[] = [];
}

export class ImportReadingsDto {
  @IsArray()
  @IsNotEmpty()
  readings: any[] = [];
}

export class ImportMultipleChoiceDto {
  @IsArray()
  @IsNotEmpty()
  multipleChoice: any[] = [];
}

export class ImportWritingPromptsDto {
  @IsArray()
  @IsNotEmpty()
  writingPrompts: any[] = [];
}

export class ImportListeningDto {
  @IsArray()
  @IsNotEmpty()
  listening: any[] = [];
}
