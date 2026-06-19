import type {
  EnrichedBookmark,
  BookmarkType,
  ToggleBookmarkDto,
  ToggleBookmarkResponse,
  DeleteBookmarkResponse,
} from '@/types/bookmarks/Bookmarks.types';
import { api } from '../client';

export const BookmarksApi = {
  getAllEnriched: (type?: BookmarkType) =>
    api.get<EnrichedBookmark[]>('/bookmarks/enriched', {
      params: type ? { type } : undefined,
    }),

  getBookmarkedIds: (type: BookmarkType) =>
    api.get<string[]>('/bookmarks/ids', { params: { type } }),

  toggle: (payload: ToggleBookmarkDto) =>
    api.post<ToggleBookmarkResponse>('/bookmarks', payload),

  remove: (id: string) => api.delete<DeleteBookmarkResponse>(`/bookmarks/${id}`),
};