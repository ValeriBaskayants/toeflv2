import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { ToggleBookmarkDto } from './dto/toggle-bookmark.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
 
@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly service: BookmarksService) {}
 
  @Get()
  findAll(@CurrentUser() user: JwtUserPayload) {
    return this.service.findAll(user.id);
  }
 
  @Post()
  toggle(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: ToggleBookmarkDto,
  ) {
    return this.service.toggle(user.id, dto.targetId, dto.type);
  }
 
  @Delete(':id')
  remove(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
  ) {
    return this.service.remove(user.id, id);
  }
}