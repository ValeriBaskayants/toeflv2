import { IsEnum, IsMongoId } from 'class-validator';
import { BookmarkType } from '@prisma/client';

export class ToggleBookmarkDto {
  @IsMongoId()
  targetId!: string;

  @IsEnum(BookmarkType)
  type!: BookmarkType;
}