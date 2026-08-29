import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { TopicMasteryService } from '../topic-mastery/topic-mastery.service';
import { MistakesService } from '../mistakes/mistakes.service';
import { computeXP, isSessionCountable, XP_BASE } from '../../constants/level-requirements';
import type { CreateReadingDto } from './dto/bulk-create-reading.dto';
import type { SubmitReadingDto } from './dto/submit-reading.dto';
import slugify from 'slugify';

interface QuestionShape {
  text: string;
  explanation?: string;
  options: Array<{ text: string; isCorrect: boolean }>;
}

export interface SubmitResult {
  results: Array<{
    questionIdx: number;
    isCorrect: boolean;
    correctIdx: number;
    explanation?: string;
  }>;
  accuracy: number;
  xpEarned: number;
  countedAsCompleted: boolean;
  bestAccuracy: number;
  isFirstAttempt: boolean;
  feedback: string;
}

const LIST_SELECT = {
  id: true, title: true, slug: true, description: true,
  level: true, topic: true, tags: true,
  wordCount: true, estimatedMinutes: true, coverImageUrl: true, createdAt: true,
} satisfies Prisma.ReadingMaterialSelect;

const REREAD_XP_MULTIPLIER = 0.3;
const MATERIAL_MASTERY_THRESHOLD = 80;

@Injectable()
export class ReadingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly topicMastery: TopicMasteryService,
    private readonly mistakes: MistakesService,
  ) { }

  async findMany(params: {
    userId: string;
    level?: Level;
    topic?: string;
    topicSlug?: string;
    search?: string;
  }) {
    const where: Prisma.ReadingMaterialWhereInput = {};
    if (params.level !== undefined) where.level = params.level;
    if (params.topic !== undefined) where.topic = { contains: params.topic, mode: 'insensitive' };
    if (params.topicSlug !== undefined) where.grammarTopics = { has: params.topicSlug };
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const materials = await this.prisma.readingMaterial.findMany({
      where,
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (materials.length === 0) return [];

    const userHistory = await this.prisma.userMistake.findMany({
      where: {
        userId: params.userId,
        source: 'READING',
        targetId: { in: materials.map((m) => m.id) },
      },
      select: { targetId: true, correctCount: true, wrongCount: true, status: true },
    });

    const historyMap = new Map(userHistory.map((h) => [h.targetId, h]));

    const enriched = materials.map((m) => {
      const history = historyMap.get(m.id);
      const total = history ? history.correctCount + history.wrongCount : 0;
      const currentAccuracy = total > 0 ? Math.round((history!.correctCount / total) * 100) : 0;

      let userStatus: 'not_started' | 'attempted' | 'completed' = 'not_started';
      if (history) {
        userStatus = history.status === 'MASTERED' ? 'completed' : 'attempted';
      }

      return { ...m, userStatus, bestAccuracy: history ? currentAccuracy : null };
    });

    return enriched.sort((a, b) => {
      const order = { not_started: 0, attempted: 1, completed: 2 };
      return order[a.userStatus] - order[b.userStatus];
    });
  }

  async findBySlug(slug: string) {
    const result = await this.prisma.readingMaterial.findUnique({ where: { slug } });
    if (result === null) throw new NotFoundException(`Reading "${slug}" not found`);
    return result;
  }

  async findById(id: string) {
    const result = await this.prisma.readingMaterial.findUnique({ where: { id } });
    if (result === null) throw new NotFoundException(`Reading ${id} not found`);
    return result;
  }

  async submitAnswers(userId: string, dto: SubmitReadingDto, timezone?: string): Promise<SubmitResult> {
    if (dto.answers.length === 0) {
      throw new BadRequestException('At least one answer is required');
    }

    const [material, user, existingHistory] = await Promise.all([
      this.prisma.readingMaterial.findUnique({ where: { id: dto.materialId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { streak: true } }),
      this.prisma.userMistake.findUnique({
        where: { userId_targetId: { userId, targetId: dto.materialId } },
      }),
    ]);

    if (material === null) throw new NotFoundException(`Reading material ${dto.materialId} not found`);

    const questions = material.questions as QuestionShape[];
    if (questions.length === 0) throw new BadRequestException('This reading material has no questions yet');

    for (const a of dto.answers) {
      if (a.questionIdx >= questions.length) {
        throw new BadRequestException(`Question index ${a.questionIdx} is out of range`);
      }
    }

    const results = dto.answers.map((a) => {
      const question = questions[a.questionIdx]!;
      const correctIdx = question.options.findIndex((o) => o.isCorrect);
      const isCorrect = question.options[a.selectedOptionIdx]?.isCorrect === true;
      return {
        questionIdx: a.questionIdx,
        isCorrect,
        correctIdx,
        explanation: question.explanation,
        selectedOptionIdx: a.selectedOptionIdx,
      };
    });

    const correctCount = results.filter((r) => r.isCorrect).length;
    const accuracy = Math.round((correctCount / results.length) * 100);
    const isFirstAttempt = existingHistory === null;

    const prevBest = existingHistory
      ? Math.round(
        (existingHistory.correctCount /
          Math.max(1, existingHistory.correctCount + existingHistory.wrongCount)) * 100,
      )
      : 0;
    const bestAccuracy = Math.max(accuracy, prevBest);

    const countedAsCompleted = isFirstAttempt && isSessionCountable(accuracy);

    const baseXP = isFirstAttempt
      ? XP_BASE.READING_COMPLETED
      : Math.round(XP_BASE.READING_COMPLETED * REREAD_XP_MULTIPLIER);
    const xpEarned = computeXP({ base: baseXP, streak: user?.streak ?? 0, accuracy });

    if (countedAsCompleted) {
      await this.progress.recordSkillCompletion({ userId, skill: 'reading', accuracy, xpEarned, timezone });
    } else {
      await this.progress.recordActivity({
        userId,
        xpEarned: Math.max(1, Math.round(xpEarned * 0.2)),
        minutesSpent: material.estimatedMinutes,
        timezone,
      });
    }

    if (material.grammarTopics.length > 0) {
      await this.topicMastery.recordPractice({ userId, topicSlugs: material.grammarTopics, kind: 'reading' });
    }

    await Promise.all(
      results.map((r) =>
        this.mistakes.recordAttempt({
          userId,
          targetId: `${dto.materialId}:${r.questionIdx}`,
          source: 'READING',
          category: 'LOGIC',
          topic: material.topic,
          level: material.level,
          isCorrect: r.isCorrect,
          userAnswer: String(r.selectedOptionIdx),
          correctAnswer: String(r.correctIdx),
        }),
      ),
    );

    await this.updateMaterialCompletion({
      userId,
      materialId: material.id,
      topic: material.topic,
      level: material.level,
      correctCount,
      totalCount: results.length,
      bestAccuracy,
      isImprovement: accuracy >= prevBest,
    });

    return {
      results: results.map(({ selectedOptionIdx, ...rest }) => rest),
      accuracy,
      xpEarned,
      countedAsCompleted,
      bestAccuracy,
      isFirstAttempt,
      feedback: buildReadingFeedback(accuracy, isFirstAttempt, correctCount, results.length),
    };
  }

  private async updateMaterialCompletion(params: {
    userId: string;
    materialId: string;
    topic: string;
    level: Level;
    correctCount: number;
    totalCount: number;
    bestAccuracy: number;
    isImprovement: boolean;
  }): Promise<void> {
    const isMastered = params.bestAccuracy >= MATERIAL_MASTERY_THRESHOLD;

    await this.prisma.userMistake.upsert({
      where: { userId_targetId: { userId: params.userId, targetId: params.materialId } },
      create: {
        userId: params.userId,
        targetId: params.materialId,
        source: 'READING',
        topic: params.topic,
        category: 'LOGIC',
        level: params.level,
        correctCount: params.correctCount,
        wrongCount: params.totalCount - params.correctCount,
        status: isMastered ? 'MASTERED' : 'LEARNING',
      },
      update: {
        ...(params.isImprovement
          ? { correctCount: params.correctCount, wrongCount: params.totalCount - params.correctCount }
          : {}),
        status: isMastered ? 'MASTERED' : 'LEARNING',
      },
    });
  }

  async getUserHistory(userId: string) {
    const history = await this.prisma.userMistake.findMany({
      where: {
        userId,
        source: 'READING',
        NOT: { targetId: { contains: ':' } },
      },
      select: { targetId: true, topic: true, level: true, correctCount: true, wrongCount: true, status: true },
      orderBy: { updatedAt: 'desc' },
    });

    return history.map((h) => {
      const total = h.correctCount + h.wrongCount;
      const bestAccuracy = total > 0 ? Math.round((h.correctCount / total) * 100) : 0;
      return { materialId: h.targetId, topic: h.topic, level: h.level, bestAccuracy, status: h.status };
    });
  }

  async bulkCreate(readings: CreateReadingDto[]) {
    if (readings.length === 0) return { totalProcessed: 0, inserted: 0, skipped: 0 };

    const prepared = readings.map((r) => {
      const wordCount = r.content.trim().split(/\s+/).length;
      return {
        ...r,
        slug: r.slug ?? slugify(r.title, { lower: true, strict: true }),
        wordCount,
        estimatedMinutes: Math.max(1, Math.ceil(wordCount / 200)),
      };
    });

    const existing = await this.prisma.readingMaterial.findMany({
      where: {
        OR: [
          { title: { in: prepared.map((p) => p.title) } },
          { slug: { in: prepared.map((p) => p.slug) } },
        ],
      },
      select: { title: true, slug: true },
    });

    const existingTitles = new Set(existing.map((e) => e.title));
    const existingSlugs = new Set(existing.map((e) => e.slug));
    const toInsert = prepared.filter((p) => !existingTitles.has(p.title) && !existingSlugs.has(p.slug));

    if (toInsert.length > 0) {
      await this.prisma.readingMaterial.createMany({ data: toInsert });
    }

    return { totalProcessed: readings.length, inserted: toInsert.length, skipped: readings.length - toInsert.length };
  }
}

function buildReadingFeedback(accuracy: number, isFirstAttempt: boolean, correctCount: number, total: number): string {
  const wrong = total - correctCount;
  if (accuracy === 100) return `Perfect! All ${total} questions correct${isFirstAttempt ? ' on your first attempt' : ''}.`;
  if (accuracy >= 80) return `${correctCount}/${total} correct (${accuracy}%). ${wrong} question${wrong > 1 ? 's' : ''} to review below.`;
  if (accuracy >= 60) return `${correctCount}/${total} correct (${accuracy}%). Re-read the tricky sections and try again.`;
  if (accuracy >= 40) return `${correctCount}/${total} correct (${accuracy}%). Focus on comprehension — read slowly and check the passage for each question.`;
  return `${correctCount}/${total} correct (${accuracy}%). Try reading the passage again carefully before answering.`;
}