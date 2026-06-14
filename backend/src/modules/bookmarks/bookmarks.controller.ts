import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { IsEnum, IsOptional } from 'class-validator';
import { BookmarkType } from '@prisma/client';
import { BookmarksService } from './bookmarks.service';
import { ToggleBookmarkDto } from './dto/toggle-bookmark.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';

class GetBookmarksDto {
  @IsOptional()
  @IsEnum(BookmarkType, { message: 'type must be a valid BookmarkType' })
  type?: BookmarkType;
}

@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly service: BookmarksService) {}

  @Get()
  findAll(@CurrentUser() user: JwtUserPayload, @Query() query: GetBookmarksDto) {
    return this.service.findAll(user.id, query.type);
  }

  @Get('enriched')
  findAllEnriched(@CurrentUser() user: JwtUserPayload, @Query() query: GetBookmarksDto) {
    return this.service.findAllEnriched(user.id, query.type);
  }

  @Get('ids')
  getBookmarkedIds(@CurrentUser() user: JwtUserPayload, @Query('type') type: BookmarkType) {
    return this.service.getBookmarkedIds(user.id, type);
  }

  @Post()
  toggle(@CurrentUser() user: JwtUserPayload, @Body() dto: ToggleBookmarkDto) {
    return this.service.toggle(user.id, dto.targetId, dto.type);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUserPayload, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
