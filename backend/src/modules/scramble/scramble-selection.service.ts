import { Injectable } from '@nestjs/common';
import { Level } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface ExerciseWeight {
  exerciseId: string;
  weight: number;
}

const NEVER_ATTEMPTED_WEIGHT = 100;
const WRONG_RAMP_HOURS = 4;      
const WRONG_BASE_WEIGHT = 70;
const MASTERED_COOLDOWN_DAYS = 14; 
const MASTERED_BASE_WEIGHT = 15;

@Injectable()
export class ScrambleSelectionService {
  constructor(private readonly prisma: PrismaService) {}

  async pickPracticeSet(userId: string, level: Level, count: number): Promise<string[]> {
    const exercises = await this.prisma.scrambleExercise.findMany({
      where: { level },
      select: { id: true },
    });
    if (exercises.length === 0) return [];

    const lastSessions = await this.prisma.scrambleSession.findMany({
      where: { userId, exerciseId: { in: exercises.map((e) => e.id) }, status: 'COMPLETED' },
      select: { exerciseId: true, isCorrect: true, completedAt: true },
      orderBy: { completedAt: 'desc' },
    });

    const lastByExercise = new Map<string, { isCorrect: boolean; completedAt: Date }>();
    for (const s of lastSessions) {
      if (!lastByExercise.has(s.exerciseId)) {
        lastByExercise.set(s.exerciseId, { isCorrect: s.isCorrect ?? false, completedAt: s.completedAt! });
      }
    }

    const now = Date.now();
    const weights: ExerciseWeight[] = exercises.map((e) => {
      const last = lastByExercise.get(e.id);

      if (last === undefined) {
        return { exerciseId: e.id, weight: NEVER_ATTEMPTED_WEIGHT };
      }

      const hoursSince = (now - last.completedAt.getTime()) / (1000 * 60 * 60);

      if (!last.isCorrect) {
        const ramp = Math.min(1, hoursSince / WRONG_RAMP_HOURS);
        return { exerciseId: e.id, weight: WRONG_BASE_WEIGHT * ramp };
      }

      const daysSince = hoursSince / 24;
      const ramp = Math.min(1, daysSince / MASTERED_COOLDOWN_DAYS);
      return { exerciseId: e.id, weight: MASTERED_BASE_WEIGHT * ramp };
    });

    return this.weightedSampleWithoutReplacement(weights, count);
  }

  private weightedSampleWithoutReplacement(items: ExerciseWeight[], count: number): string[] {
    const pool = items.filter((i) => i.weight > 0);
    const picked: string[] = [];

    while (picked.length < count && pool.length > 0) {
      const totalWeight = pool.reduce((sum, i) => sum + i.weight, 0);
      if (totalWeight <= 0) break;

      let r = Math.random() * totalWeight;
      let idx = 0;
      for (; idx < pool.length; idx++) {
        r -= pool[idx]!.weight;
        if (r <= 0) break;
      }

      const [chosen] = pool.splice(Math.min(idx, pool.length - 1), 1);
      picked.push(chosen!.exerciseId);
    }

    return picked;
  }
}