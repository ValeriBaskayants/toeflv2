import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookmarkType } from '@prisma/client';

@Injectable()
export class BookmarksService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    if (!userId) {
      throw new NotFoundException("User not found");
    }

    return this.prisma.bookmark.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggle(userId: string, targetId: string, type: BookmarkType) {
    const existing = await this.prisma.bookmark.findUnique({
      where: {
        userId_targetId_type: { userId, targetId, type },
      },
    });

    if (existing) {
      await this.prisma.bookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }

    const bookmark = await this.prisma.bookmark.create({
      data: { userId, targetId, type },
    });
    return { bookmarked: true, bookmark };
  }

  async remove(userId: string, bookmarkId: string) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: { id: bookmarkId },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    if (bookmark.userId !== userId) {
      throw new ForbiddenException('You can only delete your own bookmarks');
    }

    await this.prisma.bookmark.delete({ where: { id: bookmarkId } });
    return { deleted: true };
  }
}