import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookmarksService } from './bookmarks.service';
import { BookmarkType } from '@prisma/client';
import { Request as ExpressRequest } from 'express';

type AuthenticatedRequest = ExpressRequest & { user: { sub: string } };

@Controller('bookmarks')
@UseGuards(JwtAuthGuard)
export class BookmarksController {
  constructor(private service: BookmarksService) {}

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.service.findAll(req.user.sub);
  }

  @Post()
  toggle(@Request() req: AuthenticatedRequest, @Body() body: { itemId: string; itemType: BookmarkType }) {
    return this.service.toggle(req.user.sub, body.itemId, body.itemType);
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.remove(req.user.sub, id);
  }
}
