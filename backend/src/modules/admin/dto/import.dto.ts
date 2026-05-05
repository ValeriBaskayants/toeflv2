import { IsArray, IsNotEmpty, IsOptional } from 'class-validator';

// В идеале вместо 'any' тут должны быть конкретные DTO (например, CreateExerciseDto)
// Но для начала мы хотя бы валидируем, что это массивы.

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