import { Injectable, NotFoundException } from '@nestjs/common';
import type { Level } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LEVEL_REQUIREMENTS, computeBandEstimate, type BandEstimateResult } from '../../constants/level-requirements';
import { isLevelInOfficialRange, type ReadingTaskKind } from '../../constants/reading-toefl-constants';

interface EvidenceRow {
  taskId: string;
  correctCount: number | null;
  totalCount: number | null;
  timedOut: boolean | null;
}

@Injectable()
export class ReadingBandEstimateService {
  constructor(private readonly prisma: PrismaService) {}

  async getEstimate(userId: string): Promise<BandEstimateResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { currentLevel: true } });
    if (user === null) {
      throw new NotFoundException('User not found');
    }

    const level = user.currentLevel;
    const accuracyMin = LEVEL_REQUIREMENTS[level].reading.accuracyMin;
    const where = { userId, status: 'COMPLETED', mode: 'TOEFL', task: { level } } as const;
    const select = { taskId: true, correctCount: true, totalCount: true, timedOut: true } as const;

    const [cw, dl, ap] = await Promise.all([
      this.evidenceFor('COMPLETE_WORDS', level, () =>
        this.prisma.readingCompleteWordsSession.findMany({ where, select, orderBy: { completedAt: 'asc' } })),
      this.evidenceFor('DAILY_LIFE', level, () =>
        this.prisma.readingDailyLifeSession.findMany({ where, select, orderBy: { completedAt: 'asc' } })),
      this.evidenceFor('ACADEMIC_PASSAGE', level, () =>
        this.prisma.readingAcademicSession.findMany({ where, select, orderBy: { completedAt: 'asc' } })),
    ]);

    const evidence = [...cw, ...dl, ...ap];
    const itemsEvaluated = evidence.reduce((sum, s) => sum + (s.totalCount ?? 0), 0);
    const correctItems = evidence.reduce((sum, s) => sum + (s.correctCount ?? 0), 0);

    return computeBandEstimate({ level, accuracyMin, itemsEvaluated, correctItems });
  }

  private async evidenceFor(kind: ReadingTaskKind, level: Level, load: () => Promise<EvidenceRow[]>): Promise<EvidenceRow[]> {
    if (!isLevelInOfficialRange(kind, level)) {
      return [];
    }

    // First attempt per task only (replays inflate accuracy), and only attempts finished inside the time limit.
    const seen = new Set<string>();
    const result: EvidenceRow[] = [];
    for (const row of await load()) {
      if (seen.has(row.taskId)) {
        continue;
      }
      seen.add(row.taskId);
      if (row.timedOut !== true) {
        result.push(row);
      }
    }
    return result;
  }
}