import { Injectable, NotFoundException } from '@nestjs/common';
import { Difficulty, Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import type { CreateExerciseDto } from './dto/bulk-create-exercise.dto';
import type { GetExercisesDto } from './dto/get-exercises.dto';
import type { SubmitExerciseDto } from './dto/submit-exercise.dto';
import { XP_RULES } from '../../constants/level-requirements';
 
const DEFAULT_LIMIT = 50;
const MAX_LIMIT     = 100;
 
@Injectable()
export class ExercisesService {
  constructor(
    private readonly prisma:    PrismaService,
    private readonly progress: ProgressService,
  ) {}
 
  async findAll(query: GetExercisesDto) {
    const where: Prisma.ExerciseWhereInput = {};
 
    if (query.level      !== undefined) { where.level      = query.level; }
    if (query.difficulty !== undefined) { where.difficulty = query.difficulty; }
    if (query.topic      !== undefined) {
      where.topic = { contains: query.topic, mode: 'insensitive' };
    }
 
    const take = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
 
    return this.prisma.exercise.findMany({
      where,
      orderBy: [{ level: 'asc' }, { difficulty: 'asc' }],
      take,
    });
  }
 
  async getTopics(level?: Level) {
    const exercises = await this.prisma.exercise.findMany({
      where:    level !== undefined ? { level } : undefined,
      select:   { topic: true },
      distinct: ['topic'],
    });
 
    return exercises.map((ex) => ex.topic).sort();
  }
 
  // ── submitAnswer ──────────────────────────────────────────────────────────
  // Evaluates user answers, records progress, returns per-blank feedback.
 
  async submitAnswer(
    userId:    string,
    dto:       SubmitExerciseDto,
    timezone?: string,
  ) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: dto.exerciseId },
    });
 
    if (exercise === null) {
      throw new NotFoundException(`Exercise ${dto.exerciseId} not found`);
    }
 
    type BlankShape = { position: number; answer: string; options: string[] };
    const blanks = exercise.blanks as BlankShape[];
 
    // Evaluate each blank (case-insensitive, trimmed)
    const results = blanks.map((blank, idx) => {
      const userAnswer    = (dto.answers[idx] ?? '').trim().toLowerCase();
      const correctAnswer = blank.answer.trim().toLowerCase();
      return {
        position:      blank.position,
        userAnswer:    dto.answers[idx] ?? '',
        correctAnswer: blank.answer,
        isCorrect:     userAnswer === correctAnswer,
      };
    });
 
    const correctCount = results.filter((r) => r.isCorrect).length;
    const totalBlanks  = blanks.length;
    const accuracy     = totalBlanks > 0
      ? Math.round((correctCount / totalBlanks) * 100)
      : 0;
 
    // XP: full for correct, partial for attempts
    const xpEarned = correctCount > 0
      ? Math.round(XP_RULES.EXERCISE_CORRECT * (accuracy / 100))
      : XP_RULES.EXERCISE_WRONG;
 
    // Record to LevelProgress (grammar skill)
    await this.progress.recordSkillCompletion({
      userId,
      skill:    'grammar',
      accuracy,
      xpEarned,
      timezone,
    });
 
    return {
      results,
      accuracy,
      xpEarned,
      explanation: exercise.explanation,
    };
  }
 
  // ── bulkCreate ────────────────────────────────────────────────────────────
 
  async bulkCreate(exercises: CreateExerciseDto[]): Promise<{
    totalProcessed: number;
    inserted:       number;
    skipped:        number;
  }> {
    if (exercises.length === 0) {
      return { totalProcessed: 0, inserted: 0, skipped: 0 };
    }
 
    const sentences = exercises.map((ex) => ex.sentence);
 
    const existing = await this.prisma.exercise.findMany({
      where:  { sentence: { in: sentences } },
      select: { sentence: true },
    });
 
    const existingSet = new Set(existing.map((e) => e.sentence));
    const toInsert    = exercises.filter((ex) => !existingSet.has(ex.sentence));
 
    if (toInsert.length > 0) {
      await this.prisma.exercise.createMany({ data: toInsert });
    }
 
    return {
      totalProcessed: exercises.length,
      inserted:       toInsert.length,
      skipped:        existing.length,
    };
  }
}