import { type ID, type ISODateString } from '../globalTypes';

export type BookmarkType =
    | 'GRAMMAR_RULE'
    | 'VOCABULARY'
    | 'READING'
    | 'WRITING_PROMPT';


export interface Bookmark {
    id: ID;
    targetId: string;
    type: BookmarkType;
    createdAt: ISODateString;
}

export interface ToggleBookmarkDto {
    targetId: string;
    type: BookmarkType;
}

export interface ToggleBookmarkResponse {
    bookmark:Bookmark
    bookmarked: boolean;
}


export interface DeleteBookmarkResponse {
    deleted: boolean;
}