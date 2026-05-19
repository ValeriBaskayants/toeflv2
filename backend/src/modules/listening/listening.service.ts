import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Level, ListeningMode, ListeningSessionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import type { CreateListeningMaterialDto } from './dto/bulk-create-listening.dto';
import type { StartSessionDto, SubmitAnswerDto, SaveNotesDto } from './dto/session.dto';
import {
  MODE_SCORE_MULTIPLIER,
  MODE_BASE_XP,
  LIST_SELECT,
  LEVEL_SPEECH_RATE,
  MODE_MAX_PLAYS,
} from 'src/constants/listening-constants';

interface ScoringParams {
  correctCount: number;
  totalCount: number;
  playCount: number;
  maxAllowedPlays: number;
  mode: ListeningMode;
}

interface ScoringResult {
  rawAccuracy: number;
  finalScore: number;
  xpEarned: number;
}

function computeScore(p: ScoringParams): ScoringResult {
  const rawAccuracy = p.totalCount > 0 ? Math.round((p.correctCount / p.totalCount) * 100) : 0;

  const multiplier = MODE_SCORE_MULTIPLIER[p.mode];

  const replayEfficiency =
    p.maxAllowedPlays <= 1 ? 1 : 1 - (p.playCount - 1) / (p.maxAllowedPlays - 1);

  const replayBonus = Math.round(replayEfficiency * 10);

  const finalScore = Math.min(100, Math.max(0, Math.round(rawAccuracy * multiplier) + replayBonus));

  const baseXP = MODE_BASE_XP[p.mode];
  const xpEarned = Math.max(1, Math.round(baseXP * (finalScore / 100)));

  return { rawAccuracy, finalScore, xpEarned };
}

@Injectable()
export class ListeningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  async findAll(query: { level?: Level; type?: string; search?: string }) {
    const where: Prisma.ListeningMaterialWhereInput = {};

    if (query.level !== undefined) {
      where.level = query.level;
    }
    if (query.type !== undefined) {
      where.type = query.type as Prisma.EnumListeningTypeFilter;
    }
    if (query.search !== undefined) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { topic: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.listeningMaterial.findMany({
      where,
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findById(id: string, userId: string) {
    const material = await this.prisma.listeningMaterial.findUnique({
      where: { id },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });

    if (material === null) {
      throw new NotFoundException(`Listening material ${id} not found`);
    }

    const openSession = await this.prisma.listeningSession.findFirst({
      where: { userId, materialId: id, status: 'IN_PROGRESS' },
      select: { id: true, mode: true, playCount: true, maxAllowedPlays: true },
    });

    const canSeeTranscript = openSession !== null && openSession.mode === 'EASY';

    return {
      ...material,
      fullText: canSeeTranscript ? material.fullText : undefined,
      openSession,

      recommendedRate: LEVEL_SPEECH_RATE[material.level],
    };
  }

  async startSession(userId: string, dto: StartSessionDto) {
    const material = await this.prisma.listeningMaterial.findUnique({
      where: { id: dto.materialId },
      select: { id: true, allowedModes: true, level: true },
    });

    if (material === null) {
      throw new NotFoundException('Listening material not found');
    }

    if (!material.allowedModes.includes(dto.mode)) {
      throw new BadRequestException(`Mode ${dto.mode} is not available for this material`);
    }

    await this.prisma.listeningSession.updateMany({
      where: { userId, materialId: dto.materialId, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' },
    });

    return this.prisma.listeningSession.create({
      data: {
        userId,
        materialId: dto.materialId,
        mode: dto.mode,
        maxAllowedPlays: MODE_MAX_PLAYS[dto.mode],
        notes: [],
        answers: [],
      },
      select: {
        id: true,
        mode: true,
        maxAllowedPlays: true,
        playCount: true,
        startedAt: true,
      },
    });
  }

  async recordPlay(userId: string, sessionId: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    if (session.playCount >= session.maxAllowedPlays) {
      throw new ForbiddenException(
        `Maximum plays (${session.maxAllowedPlays}) reached for this session`,
      );
    }

    return this.prisma.listeningSession.update({
      where: { id: sessionId },
      data: { playCount: { increment: 1 } },
      select: { playCount: true, maxAllowedPlays: true },
    });
  }

  async saveNotes(userId: string, sessionId: string, dto: SaveNotesDto) {
    await this.getOwnedInProgressSession(userId, sessionId);

    return this.prisma.listeningSession.update({
      where: { id: sessionId },
      data: { notes: dto.notes },
      select: { id: true, notes: true },
    });
  }

  async submitAnswer(userId: string, sessionId: string, dto: SubmitAnswerDto) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const question = await this.prisma.listeningQuestion.findUnique({
      where: { id: dto.questionId },
      select: { correctIndex: true, listeningMaterialId: true },
    });

    if (question === null) {
      throw new NotFoundException('Question not found');
    }

    const material = await this.prisma.listeningSession.findUnique({
      where: { id: sessionId },
      select: { materialId: true },
    });

    if (material?.materialId !== question.listeningMaterialId) {
      throw new BadRequestException('Question does not belong to this session');
    }

    const isCorrect = dto.selectedIndex === question.correctIndex;

    const existingAnswers = (session.answers as Prisma.ListeningAnswerRecordCreateInput[]) ?? [];
    const filtered = existingAnswers.filter((a) => a.questionId !== dto.questionId);

    const newAnswer = {
      questionId: dto.questionId,
      selectedIndex: dto.selectedIndex,
      isCorrect,
      answeredAtSec: dto.currentAudioSec ?? null,
    };

    await this.prisma.listeningSession.update({
      where: { id: sessionId },
      data: { answers: [...filtered, newAnswer] },
    });

    return { isCorrect, correctIndex: question.correctIndex };
  }

  async completeSession(userId: string, sessionId: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const questionCount = await this.prisma.listeningQuestion.count({
      where: { listeningMaterialId: session.materialId },
    });

    const answers = (session.answers as Array<{ isCorrect: boolean }>) ?? [];
    const correctCount = answers.filter((a) => a.isCorrect).length;

    const { rawAccuracy, finalScore, xpEarned } = computeScore({
      correctCount,
      totalCount: questionCount,
      playCount: session.playCount,
      maxAllowedPlays: session.maxAllowedPlays,
      mode: session.mode,
    });

    const completed = await this.prisma.listeningSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        correctCount,
        totalCount: questionCount,
        rawAccuracy,
        finalScore,
        xpEarned,
      },
    });

    await this.progress.recordListeningCompletion({
      userId,
      accuracy: rawAccuracy,
      xpEarned,
    });

    const material = await this.prisma.listeningMaterial.findUnique({
      where: { id: session.materialId },
      select: { fullText: true },
    });

    return {
      ...completed,
      transcript: material?.fullText,
    };
  }

  async getUserSessions(userId: string, materialId?: string) {
    const where: Prisma.ListeningSessionWhereInput = { userId };
    if (materialId !== undefined) {
      where.materialId = materialId;
    }

    return this.prisma.listeningSession.findMany({
      where,
      select: {
        id: true,
        mode: true,
        status: true,
        playCount: true,
        finalScore: true,
        xpEarned: true,
        startedAt: true,
        completedAt: true,
        material: {
          select: { id: true, title: true, level: true, type: true },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  async bulkCreate(items: CreateListeningMaterialDto[]): Promise<{
    totalProcessed: number;
    inserted: number;
    skipped: number;
  }> {
    if (items.length === 0) {
      return { totalProcessed: 0, inserted: 0, skipped: 0 };
    }

    const titles = items.map((i) => i.title);

    const existing = await this.prisma.listeningMaterial.findMany({
      where: { title: { in: titles } },
      select: { title: true },
    });

    const existingSet = new Set(existing.map((e) => e.title));
    const toInsert = items.filter((i) => !existingSet.has(i.title));

    if (toInsert.length > 0) {
      for (const item of toInsert) {
        const { questions, segments, ...materialData } = item;
        await this.prisma.listeningMaterial.create({
          data: {
            ...materialData,
            segments: segments ?? [],
            speakerRate: materialData.speakerRate ?? LEVEL_SPEECH_RATE[materialData.level],
            questions: {
              create: (questions ?? []).map((q, idx) => ({
                ...q,
                orderIndex: idx,
              })),
            },
          },
        });
      }
    }

    return {
      totalProcessed: items.length,
      inserted: toInsert.length,
      skipped: existing.length,
    };
  }

  private async getOwnedInProgressSession(userId: string, sessionId: string) {
    const session = await this.prisma.listeningSession.findUnique({
      where: { id: sessionId },
    });

    if (session === null) {
      throw new NotFoundException('Session not found');
    }
    if (session.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Session is already ${session.status.toLowerCase()}`);
    }

    return session;
  }
}
