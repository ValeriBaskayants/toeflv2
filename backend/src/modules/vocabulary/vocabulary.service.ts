import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Level, PartOfSpeech, Prisma, Vocabulary, WordLearningStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { LEVEL_ORDER } from '../../constants/level-requirements';
import type { CreateVocabularyDto } from './dto/bulk-create-vocabulary.dto';
import type { GetFlashcardsDto, GetVocabularyDto } from './dto/get-vocabulary.dto';
import type { SubmitVocabAnswerDto } from './dto/submit-vocab-answer.dto';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DISTRACTOR_COUNT = 3;

export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;

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



export interface MCQOption {
  id: string;
  text: string;
}

export interface MCQCard {
  cardId: string;
  type: 'MCQ';
  word: string;
  pronunciation: string;
  level: Level;
  partOfSpeech: PartOfSpeech;
  imageUrl?: string;
  options: MCQOption[];
}

export interface ClozeCard {
  cardId: string;
  type: 'CLOZE';
  before: string;
  after: string;
  synonyms: string[];
  level: Level;
  partOfSpeech: PartOfSpeech;
  wordLength: number;
}

export type VocabCard = MCQCard | ClozeCard;



function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function applySM2(card: SM2Card, quality: SM2Quality): SM2Result {
  let { easinessFactor, interval, repetitions } = card;

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
    if (card.status === 'MASTERED') {
      easinessFactor = Math.max(1.3, easinessFactor - 0.3);
    }
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      const qualityBonus = quality === 5 ? 1.1 : 1.0;
      interval = Math.round(interval * easinessFactor * qualityBonus);
    }
    repetitions += 1;
  }

  easinessFactor = Math.min(
    3.0,
    Math.max(1.3, easinessFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  const status: WordLearningStatus =
    repetitions === 0 ? 'NEW' :
      repetitions < 3 ? 'LEARNING' :
        repetitions < 6 || easinessFactor < 2.0 ? 'REVIEW' :
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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** * Finds the first example sentence containing the word (or its forms) 
 * and splits it into { before, after } around the match. 
 */
function buildClozeSplit(word: string, examples: string[], forms?: any): { before: string; after: string } | null {
  if (examples.length === 0) return null;

  const shuffled = [...examples].sort(() => Math.random() - 0.5);


  const variations: string[] = [word];
  if (forms && typeof forms === 'object') {
    ['base', 'past', 'pastParticiple', 'thirdPerson', 'presentParticiple'].forEach((key) => {
      if (forms[key]) variations.push(forms[key]);
    });
  }


  const validVariations = [...new Set(variations.filter(Boolean))].map(escapeRegExp);


  const exactRegex = new RegExp(`\\b(${validVariations.join('|')})\\b`, 'i');

  for (const ex of shuffled) {
    const match = exactRegex.exec(ex);
    if (match !== null) {
      return {
        before: ex.slice(0, match.index),
        after: ex.slice(match.index + match[0].length),
      };
    }
  }


  const fallbackRegex = new RegExp(`\\b${escapeRegExp(word)}(s|ed|ing|d|es)?\\b`, 'i');

  for (const ex of shuffled) {
    const match = fallbackRegex.exec(ex);
    if (match !== null) {
      return {
        before: ex.slice(0, match.index),
        after: ex.slice(match.index + match[0].length),
      };
    }
  }

  return null;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

@Injectable()
export class VocabularyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressService: ProgressService,
  ) { }



  async findAll(query: GetVocabularyDto) {
    const where: Prisma.VocabularyWhereInput = {};
    if (query.level !== undefined) where.level = query.level;
    if (query.type !== undefined) where.type = query.type;
    if (query.search !== undefined) where.word = { contains: query.search, mode: 'insensitive' };

    const take = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    return this.prisma.vocabulary.findMany({ where, orderBy: { word: 'asc' }, take });
  }

  async getUserProgress(userId: string) {
    const [total, learned, mastered, dueToday] = await Promise.all([
      this.prisma.vocabulary.count(),
      this.prisma.userVocabularyProgress.count({
        where: { userId, status: { in: ['LEARNING', 'REVIEW', 'MASTERED'] } },
      }),
      this.prisma.userVocabularyProgress.count({ where: { userId, status: 'MASTERED' } }),
      this.prisma.userVocabularyProgress.count({
        where: { userId, nextReviewDate: { lte: new Date() } },
      }),
    ]);

    return { total, learned, mastered, dueToday };
  }



  async reviewWord(userId: string, wordId: string, quality: SM2Quality, timezone?: string) {
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

    const wasAlreadyMastered = baseCard.status === 'MASTERED';
    const updated = applySM2(baseCard, quality);

    const saved = await this.prisma.userVocabularyProgress.upsert({
      where: { userId_wordId: { userId, wordId } },
      create: { userId, wordId, ...updated },
      update: updated,
    });

    const justMastered = !wasAlreadyMastered && saved.status === 'MASTERED';
    if (justMastered) {
      await this.progressService.recordVocabularyLearned({ userId, timezone });
    }

    return {
      status: saved.status,
      nextReviewDate: saved.nextReviewDate,
      interval: saved.interval,
      repetitions: saved.repetitions,
      easinessFactor: saved.easinessFactor,
      justMastered,
    };
  }


  async getFlashcards(userId: string, query: GetFlashcardsDto) {
    const now = new Date();
    const take = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const vocabFilter: Prisma.VocabularyWhereInput = {};
    if (query.level !== undefined) vocabFilter.level = query.level;
    if (query.type !== undefined) vocabFilter.type = query.type;

    const dueProgress = await this.prisma.userVocabularyProgress.findMany({
      where: { userId, nextReviewDate: { lte: now }, vocabulary: vocabFilter },
      include: { vocabulary: true },
      orderBy: { nextReviewDate: 'asc' },
      take,
    });

    if (dueProgress.length >= take) {
      return dueProgress.map(({ vocabulary, ...progress }) => ({ progress, word: vocabulary }));
    }

    const remainingLimit = take - dueProgress.length;
    const newWords = await this.prisma.vocabulary.findMany({
      where: { ...vocabFilter, userProgress: { none: { userId } } },
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
      });
    }

    return [
      ...dueProgress.map(({ vocabulary, ...progress }) => ({ progress, word: vocabulary })),
      ...newWords.map((word) => ({ progress: null, word })),
    ];
  }
  async getSession(userId: string, query: GetFlashcardsDto): Promise<VocabCard[]> {
    const now = new Date();
    const take = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const vocabFilter: Prisma.VocabularyWhereInput = {};
    if (query.level !== undefined) vocabFilter.level = query.level;
    if (query.type !== undefined) vocabFilter.type = query.type;

    const dueProgress = await this.prisma.userVocabularyProgress.findMany({
      where: { userId, nextReviewDate: { lte: now }, vocabulary: vocabFilter },
      include: { vocabulary: true },
      orderBy: { nextReviewDate: 'asc' },
      take,
    });

    let entries: Array<{ word: Vocabulary; status: WordLearningStatus }> = dueProgress.map((p) => ({
      word: p.vocabulary,
      status: p.status,
    }));

    if (entries.length < take) {
      const remaining = take - entries.length;
      const newWords = await this.prisma.vocabulary.findMany({
        where: { ...vocabFilter, userProgress: { none: { userId } } },
        orderBy: { word: 'asc' },
        take: remaining,
      });



      entries = [...entries, ...newWords.map((word) => ({ word, status: 'NEW' as WordLearningStatus }))];
    }

    return Promise.all(
      entries.map((e) => this.buildCard(e.word, e.status === 'NEW' ? 'MCQ' : 'CLOZE')),
    );
  }

  private async buildCard(word: Vocabulary, mode: 'MCQ' | 'CLOZE'): Promise<VocabCard> {
    if (mode === 'CLOZE') {
      const split = buildClozeSplit(word.word, word.examples, word.forms);
      if (split !== null) {
        return {
          cardId: word.id,
          type: 'CLOZE',
          before: split.before,
          after: split.after,
          synonyms: word.synonyms.slice(0, 4),
          level: word.level,
          partOfSpeech: word.type,
          wordLength: word.word.length,
        };
      }

    }

    const distractors = await this.getDistractors(word, DISTRACTOR_COUNT);
    const options = shuffle([
      { id: word.id, text: word.definition },
      ...distractors.map((d) => ({ id: d.id, text: d.definition })),
    ]);

    return {
      cardId: word.id,
      type: 'MCQ',
      word: word.word,
      pronunciation: word.pronunciation,
      level: word.level,
      partOfSpeech: word.type,
      ...(word.imageUrl !== null && word.imageUrl !== undefined ? { imageUrl: word.imageUrl } : {}),
      options,
    };
  }

  /** Distractors: same part of speech, CEFR level ±1 step, distinct definitions. */
  private async getDistractors(
    word: Vocabulary,
    count: number,
  ): Promise<Array<{ id: string; definition: string }>> {
    const idx = LEVEL_ORDER.indexOf(word.level);
    const nearLevels: Level[] = [word.level];
    if (idx > 0) nearLevels.push(LEVEL_ORDER[idx - 1]!);
    if (idx < LEVEL_ORDER.length - 1) nearLevels.push(LEVEL_ORDER[idx + 1]!);

    const pool = await this.prisma.vocabulary.findMany({
      where: { type: word.type, level: { in: nearLevels }, id: { not: word.id } },
      select: { id: true, definition: true },
      take: 30,
    });

    const picked: Array<{ id: string; definition: string }> = [];
    const seen = new Set<string>([word.definition]);

    for (const p of shuffle(pool)) {
      if (picked.length >= count) break;
      if (seen.has(p.definition)) continue;
      seen.add(p.definition);
      picked.push(p);
    }

    if (picked.length < count) {
      const extra = await this.prisma.vocabulary.findMany({
        where: { id: { notIn: [word.id, ...picked.map((p) => p.id)] } },
        select: { id: true, definition: true },
        take: (count - picked.length) * 5,
      });
      for (const p of shuffle(extra)) {
        if (picked.length >= count) break;
        if (seen.has(p.definition)) continue;
        seen.add(p.definition);
        picked.push(p);
      }
    }

    return picked;
  }



  async submitAnswer(userId: string, dto: SubmitVocabAnswerDto, timezone?: string) {
    const word = await this.prisma.vocabulary.findUnique({ where: { id: dto.wordId } });
    if (word === null) throw new NotFoundException('Word not found');

    let isCorrect: boolean;

    if (dto.type === 'MCQ') {
      if (dto.selectedId === undefined) {
        throw new BadRequestException('selectedId is required for MCQ answers');
      }
      isCorrect = dto.selectedId === word.id;
    } else {
      if (dto.answerText === undefined) {
        throw new BadRequestException('answerText is required for CLOZE answers');
      }

      const userAnswer = normalizeAnswer(dto.answerText);


      const validAnswers = new Set([normalizeAnswer(word.word)]);

      if (word.forms && typeof word.forms === 'object') {
        const forms = word.forms as any;
        ['base', 'past', 'pastParticiple', 'thirdPerson', 'presentParticiple'].forEach((key) => {
          if (forms[key]) validAnswers.add(normalizeAnswer(forms[key]));
        });
      }

      isCorrect = validAnswers.has(userAnswer);
    }

    const hintsUsed = dto.hintsUsed ?? 0;
    const quality: SM2Quality = isCorrect
      ? hintsUsed >= 2 ? 3 : hintsUsed === 1 ? 4 : 5
      : hintsUsed > 0 ? 1 : 0;

    const progressResult = await this.reviewWord(userId, dto.wordId, quality, timezone);

    return {
      isCorrect,
      correctAnswer: word.word,
      definition: word.definition,
      definitionRu: word.definitionRu,
      ...progressResult,
    };
  }



  async bulkCreate(words: CreateVocabularyDto[]): Promise<{
    totalProcessed: number;
    inserted: number;
    skipped: number;
  }> {
    if (words.length === 0) return { totalProcessed: 0, inserted: 0, skipped: 0 };

    const wordStrings = words.map((w) => w.word);
    const existing = await this.prisma.vocabulary.findMany({
      where: { word: { in: wordStrings } },
      select: { word: true },
    });

    const existingSet = new Set(existing.map((e) => e.word));
    const toInsert = words.filter((w) => !existingSet.has(w.word));

    if (toInsert.length > 0) {
      await this.prisma.vocabulary.createMany({ data: toInsert });
    }

    return { totalProcessed: words.length, inserted: toInsert.length, skipped: existing.length };
  }
}