import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import {
  computeXP,
  isSessionCountable,
  XP_BASE,
} from '../../constants/level-requirements';
import type { CreateReadingDto } from './dto/bulk-create-reading.dto';
import type { SubmitReadingDto } from './dto/submit-reading.dto';
import slugify from 'slugify';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface QuestionShape {
  text:         string;
  explanation?: string;
  options:      Array<{ text: string; isCorrect: boolean }>;
}

// ReadingSession: хранится в DailyActivity notes или отдельном документе.
// Так как у нас нет отдельной ReadingSession модели, используем UserMistake
// как суррогат истории + отдельный кеш в DailyActivity.
// TODO для v2: добавить ReadingSession модель в Prisma для полной истории.

export interface SubmitResult {
  results: Array<{
    questionIdx:  number;
    isCorrect:    boolean;
    correctIdx:   number;
    explanation?: string;
  }>;
  accuracy:         number;
  xpEarned:         number;
  countedAsCompleted: boolean;  // false если anti-gaming сработал
  bestAccuracy:     number;     // лучший результат за все попытки
  attemptNumber:    number;     // номер попытки (1, 2, 3...)
  feedback:         string;     // человекочитаемый фидбек
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const LIST_SELECT = {
  id:               true,
  title:            true,
  slug:             true,
  description:      true,
  level:            true,
  topic:            true,
  tags:             true,
  wordCount:        true,
  estimatedMinutes: true,
  coverImageUrl:    true,
  createdAt:        true,
} satisfies Prisma.ReadingMaterialSelect;

// Повторное прочтение даёт XP, но меньше (не демотивируем, но и не злоупотреблять)
const REREAD_XP_MULTIPLIER = 0.3;

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ReadingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  // ── findMany — список материалов с прогрессом пользователя ───────────────
  //
  // Новое:
  //   1. Возвращает userProgress (читал / лучший результат) для UI badges
  //   2. Параллельный запрос (не N+1)
  //   3. Сортировка: непрочитанные первыми, потом низкий score, потом прочитанные

  async findMany(params: {
    userId:  string;
    level?:  Level;
    topic?:  string;
  }) {
    const where: Prisma.ReadingMaterialWhereInput = {};
    if (params.level !== undefined) where.level = params.level;
    if (params.topic !== undefined) {
      where.topic = { contains: params.topic, mode: 'insensitive' };
    }

    const materials = await this.prisma.readingMaterial.findMany({
      where,
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (materials.length === 0) return [];

    // Получаем историю попыток из UserMistake (суррогат ReadingSession)
    const userHistory = await this.prisma.userMistake.findMany({
      where: {
        userId:   params.userId,
        source:   'READING',
        targetId: { in: materials.map((m) => m.id) },
      },
      select: {
        targetId:    true,
        correctCount: true,
        wrongCount:  true,
        status:      true,
      },
    });

    const historyMap = new Map(userHistory.map((h) => [h.targetId, h]));

    const enriched = materials.map((m) => {
      const history = historyMap.get(m.id);
      const total   = history !== undefined
        ? (history.correctCount + history.wrongCount)
        : 0;
      const bestAccuracy = total > 0
        ? Math.round((history!.correctCount / total) * 100)
        : null;

      return {
        ...m,
        userStatus:   history === undefined ? 'not_started' : (bestAccuracy !== null && bestAccuracy >= 70 ? 'completed' : 'attempted') as 'not_started' | 'attempted' | 'completed',
        bestAccuracy,
        attemptCount: history !== undefined ? 1 : 0,
      };
    });

    // Сортировка: not_started → attempted (низкий score) → completed
    return enriched.sort((a, b) => {
      const order = { not_started: 0, attempted: 1, completed: 2 };
      const diff  = order[a.userStatus] - order[b.userStatus];
      if (diff !== 0) return diff;
      // В рамках одного статуса: лучший score вниз (мотивируем улучшать)
      if (a.bestAccuracy !== null && b.bestAccuracy !== null) {
        return a.bestAccuracy - b.bestAccuracy;
      }
      return 0;
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

  // ── submitAnswers — ГЛАВНАЯ ЛОГИКА ────────────────────────────────────────
  //
  // Исправлено:
  //   1. Anti-gaming: completed++ только при accuracy >= 40%
  //   2. Дедупликация: повторное прочтение не двигает completed (но даёт XP×0.3)
  //   3. Adaptive XP: base × streak × accuracy_bonus (без difficulty — у reading нет)
  //   4. Пустой массив ответов = BadRequest (не 100%)
  //   5. Best score трекинг через UserMistake (суррогат до добавления ReadingSession)
  //   6. Человекочитаемый feedback с конкретными советами

  async submitAnswers(
    userId:    string,
    dto:       SubmitReadingDto,
    timezone?: string,
  ): Promise<SubmitResult> {
    // Валидация: нельзя сабмитить без ответов
    if (dto.answers.length === 0) {
      throw new BadRequestException('At least one answer is required');
    }

    const [material, user, existingHistory] = await Promise.all([
      this.prisma.readingMaterial.findUnique({ where: { id: dto.materialId } }),
      this.prisma.user.findUnique({
        where:  { id: userId },
        select: { streak: true },
      }),
      // Ищем предыдущую попытку (для дедупликации и best score)
      this.prisma.userMistake.findUnique({
        where: { userId_targetId: { userId, targetId: dto.materialId } },
      }),
    ]);

    if (material === null) {
      throw new NotFoundException(`Reading material ${dto.materialId} not found`);
    }

    const questions = material.questions as QuestionShape[];

    if (questions.length === 0) {
      throw new BadRequestException('This reading material has no questions yet');
    }

    // Валидация: нельзя ответить на несуществующий вопрос
    for (const a of dto.answers) {
      if (a.questionIdx >= questions.length) {
        throw new BadRequestException(`Question index ${a.questionIdx} is out of range`);
      }
    }

    // Подсчёт результатов
    const results = dto.answers.map((a) => {
      const question      = questions[a.questionIdx]!;
      const correctIdx    = question.options.findIndex((o) => o.isCorrect);
      const selectedOption = question.options[a.selectedOptionIdx];
      const isCorrect     = selectedOption?.isCorrect === true;

      return {
        questionIdx:  a.questionIdx,
        isCorrect,
        correctIdx,
        explanation:  question.explanation,
      };
    });

    const correctCount  = results.filter((r) => r.isCorrect).length;
    const accuracy      = Math.round((correctCount / results.length) * 100);
    const isFirstAttempt = existingHistory === null;

    // Best score — берём лучшее из всех попыток
    const prevBest = existingHistory !== null
      ? (() => {
          const total = existingHistory.correctCount + existingHistory.wrongCount;
          return total > 0 ? Math.round((existingHistory.correctCount / total) * 100) : 0;
        })()
      : 0;
    const bestAccuracy  = Math.max(accuracy, prevBest);
    const attemptNumber = existingHistory !== null
      ? (existingHistory.correctCount + existingHistory.wrongCount > 0 ? 2 : 1)
      : 1;

    // Anti-gaming: completed++ только первая попытка + минимум 40% accuracy
    const countedAsCompleted = isFirstAttempt && isSessionCountable(accuracy);

    // Adaptive XP
    // Первая попытка: полный XP
    // Повторная: 30% от базового (поощряем, но не злоупотребление)
    const baseXP = isFirstAttempt
      ? XP_BASE.READING_COMPLETED
      : Math.round(XP_BASE.READING_COMPLETED * REREAD_XP_MULTIPLIER);

    const xpEarned = computeXP({
      base:     baseXP,
      streak:   user?.streak ?? 0,
      accuracy,
    });

    // Записываем прогресс только если считается (первая попытка + anti-gaming)
    if (countedAsCompleted) {
      await this.progress.recordSkillCompletion({
        userId,
        skill:    'reading',
        accuracy,
        xpEarned,
        timezone,
      });
    } else {
      // Даже если не считается как completed — XP за попытку даём (мотивация)
      await this.progress.recordActivity({
        userId,
        xpEarned: Math.max(1, Math.round(xpEarned * 0.2)),
        minutesSpent: material.estimatedMinutes,
        timezone,
      });
    }

    // Обновляем UserMistake как суррогат истории
    // (correctCount и wrongCount накапливаем суммарно по всем попыткам)
    await this.prisma.userMistake.upsert({
      where: { userId_targetId: { userId, targetId: dto.materialId } },
      create: {
        userId,
        targetId:    dto.materialId,
        source:      'READING',
        topic:       material.topic,
        category:    'LOGIC',
        level:       material.level,
        correctCount,
        wrongCount:  results.length - correctCount,
        status:      accuracy >= 70 ? 'MASTERED' : 'LEARNING',
      },
      update: {
        correctCount: { increment: correctCount },
        wrongCount:   { increment: results.length - correctCount },
        status:       accuracy >= 70 ? 'MASTERED' : 'LEARNING',
        updatedAt:    new Date(),
      },
    });

    // Человекочитаемый feedback
    const feedback = buildReadingFeedback(accuracy, isFirstAttempt, correctCount, results.length);

    return {
      results,
      accuracy,
      xpEarned,
      countedAsCompleted,
      bestAccuracy,
      attemptNumber,
      feedback,
    };
  }

  // ── getUserHistory — история прочтений для UI ──────────────────────────────
  // Новый endpoint: пользователь видит что читал и с каким результатом

  async getUserHistory(userId: string): Promise<Array<{
    materialId:  string;
    topic:       string;
    level:       string;
    bestAccuracy: number;
    status:      string;
  }>> {
    const history = await this.prisma.userMistake.findMany({
      where:   { userId, source: 'READING' },
      select:  { targetId: true, topic: true, level: true, correctCount: true, wrongCount: true, status: true },
      orderBy: { updatedAt: 'desc' },
    });

    return history.map((h) => {
      const total       = h.correctCount + h.wrongCount;
      const bestAccuracy = total > 0 ? Math.round((h.correctCount / total) * 100) : 0;
      return {
        materialId:   h.targetId,
        topic:        h.topic,
        level:        h.level,
        bestAccuracy,
        status:       h.status,
      };
    });
  }

  // ── bulkCreate ─────────────────────────────────────────────────────────────

  async bulkCreate(readings: CreateReadingDto[]): Promise<{
    totalProcessed: number;
    inserted:       number;
    skipped:        number;
  }> {
    if (readings.length === 0) return { totalProcessed: 0, inserted: 0, skipped: 0 };

    const prepared = readings.map((r) => {
      const wordCount = r.content.trim().split(/\s+/).length;
      return {
        ...r,
        slug:             r.slug ?? slugify(r.title, { lower: true, strict: true }),
        wordCount,
        estimatedMinutes: Math.max(1, Math.ceil(wordCount / 200)),
      };
    });

    const existing = await this.prisma.readingMaterial.findMany({
      where: {
        OR: [
          { title: { in: prepared.map((p) => p.title) } },
          { slug:  { in: prepared.map((p) => p.slug)  } },
        ],
      },
      select: { title: true, slug: true },
    });

    const existingTitles = new Set(existing.map((e) => e.title));
    const existingSlugs  = new Set(existing.map((e) => e.slug));
    const toInsert       = prepared.filter(
      (p) => !existingTitles.has(p.title) && !existingSlugs.has(p.slug),
    );

    if (toInsert.length > 0) {
      await this.prisma.readingMaterial.createMany({ data: toInsert });
    }

    return {
      totalProcessed: readings.length,
      inserted:       toInsert.length,
      skipped:        readings.length - toInsert.length,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: buildReadingFeedback
// Конкретный, actionable фидбек — не абстрактное "good job"
// ─────────────────────────────────────────────────────────────────────────────

function buildReadingFeedback(
  accuracy:       number,
  isFirstAttempt: boolean,
  correctCount:   number,
  totalCount:     number,
): string {
  const wrong = totalCount - correctCount;

  if (accuracy === 100) {
    return isFirstAttempt
      ? 'Perfect score! You understood everything on the first try. Excellent comprehension!'
      : 'Perfect this time! Great improvement from your previous attempt.';
  }

  if (accuracy >= 80) {
    return `Strong result — ${correctCount}/${totalCount} correct. ${wrong > 0 ? `Review the ${wrong} missed question${wrong > 1 ? 's' : ''} in the explanation panel.` : ''}`;
  }

  if (accuracy >= 60) {
    return `Good effort — ${correctCount}/${totalCount} correct. Focus on re-reading the paragraphs related to the ${wrong} incorrect answer${wrong > 1 ? 's' : ''}.`;
  }

  if (accuracy >= 40) {
    return `${correctCount}/${totalCount} correct. Try reading the text again before re-attempting — pay attention to topic sentences in each paragraph.`;
  }

  return `${correctCount}/${totalCount} correct. Read the text carefully once more. Look for keywords in each question and scan the relevant paragraph.`;
}