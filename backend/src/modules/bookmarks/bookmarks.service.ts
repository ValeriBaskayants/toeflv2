import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookmarkType, Prisma } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// BOOKMARKS SERVICE
//
// Что было:
//   findAll → только { id, targetId, type, createdAt }
//   Фронт получает ID без данных → нужно делать N запросов чтобы показать title
//
// Что стало:
//   findAll           → базовый список (быстрый, для проверки "bookmarked?" state)
//   findAllEnriched   → список с реальными данными по каждому типу
//   Фильтр по type    → пользователь смотрит только "Мои Grammar" или "Мои Reading"
// ─────────────────────────────────────────────────────────────────────────────

const BASE_SELECT = {
  id: true,
  targetId: true,
  type: true,
  createdAt: true,
} satisfies Prisma.BookmarkSelect;

// Обогащённый item — фронт получает всё для рендера в одном запросе
export interface EnrichedBookmark {
  id: string;
  targetId: string;
  type: BookmarkType;
  createdAt: Date;
  // Данные самого объекта (null если объект удалён из БД)
  data: {
    title: string;
    level?: string;
    topic?: string;
    slug?: string;
  } | null;
}

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  // ── findAll — быстрый базовый список ──────────────────────────────────────
  // Используется для проверки isBookmarked на страницах контента
  // (просто набор targetId — без лишних JOIN'ов)

  async findAll(userId: string, type?: BookmarkType) {
    const where: Prisma.BookmarkWhereInput = { userId };
    if (type !== undefined) where.type = type;

    return this.prisma.bookmark.findMany({
      where,
      select: BASE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── findAllEnriched — список с данными объектов ───────────────────────────
  //
  // Алгоритм:
  //   1. Загружаем все закладки пользователя
  //   2. Группируем targetId по типу
  //   3. Делаем параллельные запросы для каждого типа
  //   4. Собираем enriched объекты
  //
  // Почему не через JOIN?
  //   В MongoDB + Prisma нет cross-collection JOIN.
  //   Делаем 4 параллельных запроса (по одному на тип) — это O(4) а не O(N).

  async findAllEnriched(userId: string, type?: BookmarkType): Promise<EnrichedBookmark[]> {
    const where: Prisma.BookmarkWhereInput = { userId };
    if (type !== undefined) where.type = type;

    const bookmarks = await this.prisma.bookmark.findMany({
      where,
      select: BASE_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    if (bookmarks.length === 0) return [];

    // Группируем по типу
    const byType: Partial<Record<BookmarkType, string[]>> = {};
    for (const b of bookmarks) {
      if (byType[b.type] === undefined) byType[b.type] = [];
      byType[b.type]!.push(b.targetId);
    }

    // Параллельно загружаем данные для каждого типа
    const [grammarRules, vocabularies, readings, writingPrompts, listeningMaterials] =
      await Promise.all([
        byType['GRAMMAR_RULE'] !== undefined
          ? this.prisma.grammarRule.findMany({
              where: { id: { in: byType['GRAMMAR_RULE'] } },
              select: { id: true, topic: true, level: true, slug: true },
            })
          : Promise.resolve([]),

        byType['VOCABULARY'] !== undefined
          ? this.prisma.vocabulary.findMany({
              where: { id: { in: byType['VOCABULARY'] } },
              select: { id: true, word: true, level: true },
            })
          : Promise.resolve([]),

        byType['READING'] !== undefined
          ? this.prisma.readingMaterial.findMany({
              where: { id: { in: byType['READING'] } },
              select: { id: true, title: true, level: true, topic: true, slug: true },
            })
          : Promise.resolve([]),

        byType['WRITING_PROMPT'] !== undefined
          ? this.prisma.writingPrompt.findMany({
              where: { id: { in: byType['WRITING_PROMPT'] } },
              select: { id: true, prompt: true, level: true, topic: true },
            })
          : Promise.resolve([]),

        byType['LISTENING'] !== undefined
          ? this.prisma.listeningMaterial.findMany({
              where: { id: { in: byType['LISTENING'] } },
              select: { id: true, title: true, level: true, topic: true },
            })
          : Promise.resolve([]),
      ]);

    // Строим Map для O(1) lookup
    const dataMap = new Map<string, EnrichedBookmark['data']>();

    for (const r of grammarRules) {
      dataMap.set(r.id, { title: r.topic, level: r.level, slug: r.slug });
    }
    for (const v of vocabularies) {
      dataMap.set(v.id, { title: v.word, level: v.level });
    }
    for (const r of readings) {
      dataMap.set(r.id, { title: r.title, level: r.level, topic: r.topic, slug: r.slug });
    }
    for (const w of writingPrompts) {
      // Для промптов показываем первые 60 символов как title
      dataMap.set(w.id, {
        title: w.prompt.slice(0, 60) + (w.prompt.length > 60 ? '…' : ''),
        level: w.level,
        topic: w.topic !== '' ? w.topic : undefined,
      });
    }
    for (const l of listeningMaterials) {
      dataMap.set(l.id, { title: l.title, level: l.level, topic: l.topic });
    }

    return bookmarks.map((b) => ({
      ...b,
      data: dataMap.get(b.targetId) ?? null,
    }));
  }

  // ── isBookmarked — быстрая проверка для UI кнопок ─────────────────────────
  // Используется на страницах контента: грамматика, чтение и т.д.
  // Возвращает Set<targetId> для O(1) проверки на фронте.

  async getBookmarkedIds(userId: string, type: BookmarkType): Promise<string[]> {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId, type },
      select: { targetId: true },
    });
    return bookmarks.map((b) => b.targetId);
  }

  // ── toggle ─────────────────────────────────────────────────────────────────
  // Идемпотентный toggle: если есть → удаляем, нет → создаём.

  async toggle(
    userId: string,
    targetId: string,
    type: BookmarkType,
  ): Promise<{ bookmarked: boolean; bookmarkId: string | null }> {
    const existing = await this.prisma.bookmark.findUnique({
      where: { userId_targetId_type: { userId, targetId, type } },
    });

    if (existing !== null) {
      await this.prisma.bookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false, bookmarkId: null };
    }

    const created = await this.prisma.bookmark.create({
      data: { userId, targetId, type },
      select: { id: true },
    });
    return { bookmarked: true, bookmarkId: created.id };
  }

  // ── remove — удаление по bookmarkId ───────────────────────────────────────

  async remove(userId: string, bookmarkId: string): Promise<{ deleted: boolean }> {
    const bookmark = await this.prisma.bookmark.findUnique({ where: { id: bookmarkId } });

    if (bookmark === null) throw new NotFoundException('Bookmark not found');
    if (bookmark.userId !== userId)
      throw new ForbiddenException('You can only delete your own bookmarks');

    await this.prisma.bookmark.delete({ where: { id: bookmarkId } });
    return { deleted: true };
  }
}
