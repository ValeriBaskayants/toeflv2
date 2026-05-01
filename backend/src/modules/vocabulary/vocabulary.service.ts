import { Injectable } from '@nestjs/common';
import { Level, PartOfSpeech, Prisma, WordLearningStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateVocabularyDto } from './dto/bulk-create-vocabulary.dto';
import type { GetFlashcardsDto, GetVocabularyDto } from './dto/get-vocabulary.dto';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

interface SM2Card {
  easinessFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
  status: WordLearningStatus;
  lastReviewedAt: Date | null;
}

interface SM2Result {
  easinessFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
  status: WordLearningStatus;
  lastReviewedAt: Date;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function applySM2(card: SM2Card, quality: 0 | 1 | 2 | 3): SM2Result {
  let { easinessFactor, interval, repetitions } = card;

  if (quality < 2) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easinessFactor);
    }
    repetitions += 1;
  }

  easinessFactor = Math.max(
    1.3,
    easinessFactor + 0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02),
  );

  const status: WordLearningStatus =
    repetitions === 0 ? 'NEW' :
    repetitions < 3 ? 'LEARNING' :
    repetitions < 6 ? 'REVIEW' :
    'MASTERED';

  return {
    easinessFactor,
    interval,
    repetitions,
    nextReviewDate: addDays(new Date(), interval),
    status,
    lastReviewedAt: new Date(),
  };
}

@Injectable()
export class VocabularyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GetVocabularyDto) {
    const where: Prisma.VocabularyWhereInput = {};

    if (query.level !== undefined) {
      where.level = query.level;
    }
    if (query.type !== undefined) {
      where.type = query.type;
    }
    if (query.search !== undefined) {
      where.word = { contains: query.search, mode: 'insensitive' };
    }

    const take = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    return this.prisma.vocabulary.findMany({
      where,
      orderBy: { word: 'asc' },
      take,
    });
  }

  async getUserProgress(userId: string) {
    const [total, learned, mastered, dueToday] = await Promise.all([
      this.prisma.vocabulary.count(),
      this.prisma.userVocabularyProgress.count({
        where: {
          userId,
          status: { in: ['LEARNING', 'REVIEW', 'MASTERED'] },
        },
      }),
      this.prisma.userVocabularyProgress.count({
        where: { userId, status: 'MASTERED' },
      }),
      this.prisma.userVocabularyProgress.count({
        where: { userId, nextReviewDate: { lte: new Date() } },
      }),
    ]);

    return { total, learned, mastered, dueToday };
  }

  async reviewWord(
    userId: string,
    wordId: string,
    quality: 0 | 1 | 2 | 3,
  ) {
    const existing = await this.prisma.userVocabularyProgress.findUnique({
      where: { userId_wordId: { userId, wordId } },
    });

    const baseCard: SM2Card = existing ?? {
      easinessFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewDate: new Date(),
      status: 'NEW',
      lastReviewedAt: null,
    };

    const updated = applySM2(baseCard, quality);

    const saved = await this.prisma.userVocabularyProgress.upsert({
      where: { userId_wordId: { userId, wordId } },
      create: { userId, wordId, ...updated },
      update: updated,
    });

    return {
      status: saved.status,
      nextReviewDate: saved.nextReviewDate,
      interval: saved.interval,
      repetitions: saved.repetitions,
    };
  }

  async getFlashcards(userId: string, query: GetFlashcardsDto) {
    const now = new Date();
    const take = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const vocabFilter: Prisma.VocabularyWhereInput = {};
    if (query.level !== undefined) {
      vocabFilter.level = query.level;
    }
    if (query.type !== undefined) {
      vocabFilter.type = query.type;
    }

    const dueProgress = await this.prisma.userVocabularyProgress.findMany({
      where: {
        userId,
        nextReviewDate: { lte: now },
        vocabulary: vocabFilter,
      },
      include: { vocabulary: true },
      orderBy: { nextReviewDate: 'asc' },
      take,
    });

    if (dueProgress.length >= take) {
      return dueProgress.map(({ vocabulary, ...progress }) => ({
        progress,
        word: vocabulary,
      }));
    }

    const remainingLimit = take - dueProgress.length;

    const newWords = await this.prisma.vocabulary.findMany({
      where: {
        ...vocabFilter,
        userProgress: { none: { userId } },
      },
      orderBy: { word: 'asc' },
      take: remainingLimit,
    });

    if (newWords.length > 0) {
      await this.prisma.userVocabularyProgress.createMany({
        data: newWords.map((word) => ({
          userId,
          wordId: word.id,
          easinessFactor: 2.5,
          interval: 1,
          repetitions: 0,
          nextReviewDate: now,
          status: 'NEW' as WordLearningStatus,
        })),
        skipDuplicates: true,
      });
    }

    const dueFormatted = dueProgress.map(({ vocabulary, ...progress }) => ({
      progress,
      word: vocabulary,
    }));

    const newFormatted = newWords.map((word) => ({
      progress: null,
      word,
    }));

    return [...dueFormatted, ...newFormatted];
  }

  async bulkCreate(words: CreateVocabularyDto[]): Promise<{
    totalProcessed: number;
    inserted: number;
    skipped: number;
  }> {
    if (words.length === 0) {
      return { totalProcessed: 0, inserted: 0, skipped: 0 };
    }

    const wordStrings = words.map((w) => w.word);

    const existing = await this.prisma.vocabulary.findMany({
      where: { word: { in: wordStrings } },
      select: { word: true },
    });

    const existingSet = new Set(existing.map((e) => e.word));
    const toInsert = words.filter((w) => !existingSet.has(w.word));

    if (toInsert.length > 0) {
      await this.prisma.vocabulary.createMany({
        data: toInsert,
        skipDuplicates: true,
      });
    }

    return {
      totalProcessed: words.length,
      inserted: toInsert.length,
      skipped: existing.length,
    };
  }
}