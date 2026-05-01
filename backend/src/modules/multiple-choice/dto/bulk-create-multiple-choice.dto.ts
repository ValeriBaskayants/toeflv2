import {
    IsArray,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    Max,
    ValidateNested,
    ArrayMinSize,
    ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Difficulty, Level } from '@prisma/client';

export class CreateMultipleChoiceDto {
    @IsString()
    @MaxLength(500)
    question!: string;

    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(6)
    @IsString({ each: true })
    @MaxLength(300, { each: true })
    options!: string[];

    @IsInt()
    @Min(0)
    correctIndex!: number;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    explanation?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    topic?: string;

    @IsEnum(Level, {
        message: 'level must be a valid CEFR level',
    })
    level!: Level;

    @IsOptional()
    @IsEnum(Difficulty)
    difficulty?: Difficulty;
}

export class BulkCreateMultipleChoiceDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateMultipleChoiceDto)
    items!: CreateMultipleChoiceDto[];
}