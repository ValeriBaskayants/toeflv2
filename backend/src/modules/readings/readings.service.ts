import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { XP_RULES } from '../../constants/level-requirements';
import type { CreateReadingDto } from './dto/bulk-create-reading.dto';
import type { SubmitReadingDto } from './dto/submit-reading.dto';
import slugify from 'slugify';

const LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  level: true,
  topic: true,
  tags: true,
  wordCount: true,
  estimatedMinutes: true,
  coverImageUrl: true,
  createdAt: true,
} satisfies Prisma.ReadingMaterialSelect;

@Injectable()
export class ReadingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  async findMany(query: { level?: Level; topic?: string }) {
    const where: Prisma.ReadingMaterialWhereInput = {};
    if (query.level !== undefined) {
      where.level = query.level;
    }
    if (query.topic !== undefined) {
      where.topic = { contains: query.topic, mode: 'insensitive' };
    }

    return this.prisma.readingMaterial.findMany({
      where,
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findBySlug(slug: string) {
    const result = await this.prisma.readingMaterial.findUnique({
      where: { slug },
    });

    if (result === null) {
      throw new NotFoundException(`Reading "${slug}" not found`);
    }

    return result;
  }

  async findById(id: string) {
    const result = await this.prisma.readingMaterial.findUnique({
      where: { id },
    });

    if (result === null) {
      throw new NotFoundException(`Reading ${id} not found`);
    }

    return result;
  }

  async submitAnswers(userId: string, dto: SubmitReadingDto, timezone?: string) {
    const material = await this.prisma.readingMaterial.findUnique({
      where: { id: dto.materialId },
    });

    if (material === null) {
      throw new NotFoundException(`Reading material ${dto.materialId} not found`);
    }

    type QuestionShape = {
      text: string;
      options: Array<{ text: string; isCorrect: boolean }>;
      explanation?: string;
    };
    const questions = material.questions as QuestionShape[];

    const results = dto.answers
      .map((a) => {
        const question = questions[a.questionIdx];
        if (question === undefined) {
          return null;
        }

        const selectedOption = question.options[a.selectedOptionIdx];
        const correctIdx = question.options.findIndex((o) => o.isCorrect);
        const isCorrect = selectedOption?.isCorrect ?? false;

        return {
          questionIdx: a.questionIdx,
          isCorrect,
          correctIdx,
          explanation: question.explanation,
        };
      })
      .filter((r) => r !== null);

    const correctCount = results.filter((r) => r?.isCorrect).length;
    const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;

    const xpEarned = Math.round(XP_RULES.READING_COMPLETED * (accuracy / 100));

    await this.progress.recordSkillCompletion({
      userId,
      skill: 'reading',
      accuracy,
      xpEarned,
      timezone,
    });

    return { results, accuracy, xpEarned };
  }

  async bulkCreate(readings: CreateReadingDto[]): Promise<{
    totalProcessed: number;
    inserted: number;
    skipped: number;
  }> {
    if (readings.length === 0) {
      return { totalProcessed: 0, inserted: 0, skipped: 0 };
    }

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

    const toInsert = prepared.filter(
      (p) => !existingTitles.has(p.title) && !existingSlugs.has(p.slug),
    );

    if (toInsert.length > 0) {
      await this.prisma.readingMaterial.createMany({ data: toInsert });
    }

    return {
      totalProcessed: readings.length,
      inserted: toInsert.length,
      skipped: readings.length - toInsert.length,
    };
  }
}
