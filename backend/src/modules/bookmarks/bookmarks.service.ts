import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookmarkType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const BASE_SELECT = { id: true, targetId: true, type: true, createdAt: true } satisfies Prisma.BookmarkSelect;
const MAX_BOOKMARKS_PER_QUERY = 200;
const PROMPT_PREVIEW_LENGTH = 60;

export interface EnrichedBookmark {
  id: string;
  targetId: string;
  type: BookmarkType;
  createdAt: Date;
  data: { title: string; level?: string; topic?: string; slug?: string } | null;
}

type EnrichedData = NonNullable<EnrichedBookmark['data']>;

function withTopic(base: EnrichedData, topic: string): EnrichedData {
  return topic !== '' ? { ...base, topic } : base;
}

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, type?: BookmarkType) {
    const where: Prisma.BookmarkWhereInput = { userId };
    if (type !== undefined) {
      where.type = type;
    }

    return this.prisma.bookmark.findMany({
      where,
      select: BASE_SELECT,
      orderBy: { createdAt: 'desc' },
      take: MAX_BOOKMARKS_PER_QUERY,
    });
  }

  async findAllEnriched(userId: string, type?: BookmarkType): Promise<EnrichedBookmark[]> {
    const bookmarks = await this.findAll(userId, type);
    if (bookmarks.length === 0) {
      return [];
    }

    const idsByType = new Map<BookmarkType, string[]>();
    for (const b of bookmarks) {
      const list = idsByType.get(b.type);
      if (list === undefined) {
        idsByType.set(b.type, [b.targetId]);
      } else {
        list.push(b.targetId);
      }
    }

    const loadIf = async <T>(t: BookmarkType, loader: (ids: string[]) => Promise<T[]>): Promise<T[]> => {
      const ids = idsByType.get(t);
      return ids === undefined ? [] : loader(ids);
    };

    const [grammar, vocab, readings, writing, listening, completeWords, dailyLife, academic] = await Promise.all([
      loadIf('GRAMMAR_RULE', (ids) =>
        this.prisma.grammarRule.findMany({ where: { id: { in: ids } }, select: { id: true, topic: true, level: true, slug: true } })),
      loadIf('VOCABULARY', (ids) =>
        this.prisma.vocabulary.findMany({ where: { id: { in: ids } }, select: { id: true, word: true, level: true } })),
      loadIf('READING', (ids) =>
        this.prisma.readingMaterial.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, level: true, topic: true, slug: true } })),
      loadIf('WRITING_PROMPT', (ids) =>
        this.prisma.writingPrompt.findMany({ where: { id: { in: ids } }, select: { id: true, prompt: true, level: true, topic: true } })),
      loadIf('LISTENING', (ids) =>
        this.prisma.listeningMaterial.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, level: true, topic: true } })),
      loadIf('READING_COMPLETE_WORDS', (ids) =>
        this.prisma.readingCompleteWords.findMany({ where: { id: { in: ids } }, select: { id: true, level: true, topic: true } })),
      loadIf('READING_DAILY_LIFE', (ids) =>
        this.prisma.readingDailyLifeTask.findMany({ where: { id: { in: ids } }, select: { id: true, level: true, topic: true, format: true } })),
      loadIf('READING_ACADEMIC', (ids) =>
        this.prisma.readingAcademicPassage.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, level: true, topic: true } })),
    ]);

    const dataMap = new Map<string, EnrichedData>();

    for (const r of grammar) {
      dataMap.set(r.id, { title: r.topic, level: r.level, slug: r.slug });
    }
    for (const v of vocab) {
      dataMap.set(v.id, { title: v.word, level: v.level });
    }
    for (const r of readings) {
      dataMap.set(r.id, { title: r.title, level: r.level, topic: r.topic, slug: r.slug });
    }
    for (const w of writing) {
      const preview = w.prompt.slice(0, PROMPT_PREVIEW_LENGTH) + (w.prompt.length > PROMPT_PREVIEW_LENGTH ? '…' : '');
      dataMap.set(w.id, withTopic({ title: preview, level: w.level }, w.topic));
    }
    for (const l of listening) {
      dataMap.set(l.id, { title: l.title, level: l.level, topic: l.topic });
    }
    for (const c of completeWords) {
      dataMap.set(c.id, withTopic({ title: 'Complete the Words', level: c.level }, c.topic));
    }
    for (const d of dailyLife) {
      dataMap.set(d.id, withTopic({ title: `Daily Life · ${d.format}`, level: d.level }, d.topic));
    }
    for (const a of academic) {
      dataMap.set(a.id, { title: a.title, level: a.level, topic: a.topic });
    }

    return bookmarks.map((b) => ({ ...b, data: dataMap.get(b.targetId) ?? null }));
  }

  async getBookmarkedIds(userId: string, type: BookmarkType): Promise<string[]> {
    const rows = await this.prisma.bookmark.findMany({
      where: { userId, type },
      select: { targetId: true },
      take: MAX_BOOKMARKS_PER_QUERY,
    });
    return rows.map((b) => b.targetId);
  }

  /** Used by task lists: which of these ids has the user bookmarked (one indexed query). */
  async getBookmarkedSet(userId: string, type: BookmarkType, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) {
      return new Set();
    }
    const rows = await this.prisma.bookmark.findMany({
      where: { userId, type, targetId: { in: ids } },
      select: { targetId: true },
    });
    return new Set(rows.map((r) => r.targetId));
  }

  async toggle(userId: string, targetId: string, type: BookmarkType): Promise<{ bookmarked: boolean; bookmarkId: string | null }> {
    const key = { userId_targetId_type: { userId, targetId, type } };
    const existing = await this.prisma.bookmark.findUnique({ where: key, select: { id: true } });

    if (existing !== null) {
      // deleteMany: a concurrent second click must not fail with P2025
      await this.prisma.bookmark.deleteMany({ where: { id: existing.id, userId } });
      return { bookmarked: false, bookmarkId: null };
    }

    if ((await this.countTarget(type, targetId)) === 0) {
      throw new NotFoundException('Bookmark target not found');
    }

    try {
      const created = await this.prisma.bookmark.create({ data: { userId, targetId, type }, select: { id: true } });
      return { bookmarked: true, bookmarkId: created.id };
    } catch (err: unknown) {
      // Double click -> two creates -> P2002 on the unique key. The bookmark exists, so report that.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const row = await this.prisma.bookmark.findUnique({ where: key, select: { id: true } });
        return { bookmarked: true, bookmarkId: row?.id ?? null };
      }
      throw err;
    }
  }

  async remove(userId: string, bookmarkId: string): Promise<{ deleted: boolean }> {
    const bookmark = await this.prisma.bookmark.findUnique({ where: { id: bookmarkId }, select: { userId: true } });

    if (bookmark === null) {
      throw new NotFoundException('Bookmark not found');
    }
    if (bookmark.userId !== userId) {
      throw new ForbiddenException('You can only delete your own bookmarks');
    }

    await this.prisma.bookmark.deleteMany({ where: { id: bookmarkId, userId } });
    return { deleted: true };
  }

  private countTarget(type: BookmarkType, id: string): Promise<number> {
    const where = { id };
    switch (type) {
      case 'GRAMMAR_RULE': return this.prisma.grammarRule.count({ where });
      case 'VOCABULARY': return this.prisma.vocabulary.count({ where });
      case 'READING': return this.prisma.readingMaterial.count({ where });
      case 'WRITING_PROMPT': return this.prisma.writingPrompt.count({ where });
      case 'LISTENING': return this.prisma.listeningMaterial.count({ where });
      case 'READING_COMPLETE_WORDS': return this.prisma.readingCompleteWords.count({ where });
      case 'READING_DAILY_LIFE': return this.prisma.readingDailyLifeTask.count({ where });
      case 'READING_ACADEMIC': return this.prisma.readingAcademicPassage.count({ where });
      default: {
        const unreachable: never = type;
        throw new Error(`Unhandled bookmark type: ${String(unreachable)}`);
      }
    }
  }
}