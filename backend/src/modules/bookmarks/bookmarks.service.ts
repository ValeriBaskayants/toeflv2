import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookmarkType, Prisma } from '@prisma/client';

const BASE_SELECT = {
  id: true,
  targetId: true,
  type: true,
  createdAt: true,
} satisfies Prisma.BookmarkSelect;


export interface EnrichedBookmark {
  id: string;
  targetId: string;
  type: BookmarkType;
  createdAt: Date;
  
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

  async findAll(userId: string, type?: BookmarkType) {
    const where: Prisma.BookmarkWhereInput = { userId };
    if (type !== undefined) where.type = type;

    return this.prisma.bookmark.findMany({
      where,
      select: BASE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllEnriched(userId: string, type?: BookmarkType): Promise<EnrichedBookmark[]> {
    const where: Prisma.BookmarkWhereInput = { userId };
    if (type !== undefined) where.type = type;

    const bookmarks = await this.prisma.bookmark.findMany({
      where,
      select: BASE_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    if (bookmarks.length === 0) return [];

    
    const byType: Partial<Record<BookmarkType, string[]>> = {};
    for (const b of bookmarks) {
      if (byType[b.type] === undefined) byType[b.type] = [];
      byType[b.type]!.push(b.targetId);
    }

    
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

  async getBookmarkedIds(userId: string, type: BookmarkType): Promise<string[]> {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId, type },
      select: { targetId: true },
    });
    return bookmarks.map((b) => b.targetId);
  }

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

  async remove(userId: string, bookmarkId: string): Promise<{ deleted: boolean }> {
    const bookmark = await this.prisma.bookmark.findUnique({ where: { id: bookmarkId } });

    if (bookmark === null) throw new NotFoundException('Bookmark not found');
    if (bookmark.userId !== userId)
      throw new ForbiddenException('You can only delete your own bookmarks');

    await this.prisma.bookmark.delete({ where: { id: bookmarkId } });
    return { deleted: true };
  }
}
