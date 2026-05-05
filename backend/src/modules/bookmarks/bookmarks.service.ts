import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookmarkType, Prisma } from '@prisma/client';
 
const LIST_SELECT = {
  id:        true,
  targetId:  true,
  type:      true,
  createdAt: true,
} satisfies Prisma.BookmarkSelect;
 
@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}
 
  async findAll(userId: string) {
    return this.prisma.bookmark.findMany({
      where:   { userId },
      select:  LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }
 
  async toggle(
    userId: string,
    targetId: string,
    type: BookmarkType,
  ): Promise<{ bookmarked: boolean }> {
    const existing = await this.prisma.bookmark.findUnique({
      where: { userId_targetId_type: { userId, targetId, type } },
    });
 
    if (existing !== null) {
      await this.prisma.bookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }
 
    await this.prisma.bookmark.create({
      data: { userId, targetId, type },
    });
    return { bookmarked: true };
  }
 
  async remove(userId: string, bookmarkId: string): Promise<{ deleted: boolean }> {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: { id: bookmarkId },
    });
 
    if (bookmark === null) {
      throw new NotFoundException('Bookmark not found');
    }
 
    if (bookmark.userId !== userId) {
      throw new ForbiddenException('You can only delete your own bookmarks');
    }
 
    await this.prisma.bookmark.delete({ where: { id: bookmarkId } });
    return { deleted: true };
  }
}