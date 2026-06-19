import { type ID, type ISODateString } from '../globalTypes';

export type BookmarkType =
  | 'GRAMMAR_RULE'
  | 'VOCABULARY'
  | 'READING'
  | 'WRITING_PROMPT'
  | 'LISTENING';


export interface Bookmark {
  id: ID;
  targetId: string;
  type: BookmarkType;
  createdAt: ISODateString;
}




export interface BookmarkData {
  title: string;
  level?: string;
  topic?: string;
  slug?: string;
}

export interface EnrichedBookmark extends Bookmark {
  data: BookmarkData | null;
}



export interface ToggleBookmarkDto {
  targetId: string;
  type: BookmarkType;
}

export interface ToggleBookmarkResponse {
  bookmarked: boolean;
  bookmarkId: string | null;
}

export interface DeleteBookmarkResponse {
  deleted: boolean;
}



export type BookmarksFilterType = 'ALL' | BookmarkType;