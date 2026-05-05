import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { BookmarkType } from '@prisma/client';
 
export class ToggleBookmarkDto {
  @IsString()
  @IsNotEmpty()
  targetId!: string;
 
  @IsEnum(BookmarkType)
  type!: BookmarkType;
}