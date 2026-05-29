import type { Bookmark, ToggleBookmarkDto, ToggleBookmarkResponse, DeleteBookmarkResponse } from '@/types/bookmarks/Bookmarks.types';
import { api } from '../client';


export const BookmarksApi = {
  
  getAll: () => 
    api.get<Bookmark[]>('/bookmarks'),

  
  toggle: (payload: ToggleBookmarkDto) => 
    api.post<ToggleBookmarkResponse>('/bookmarks', payload),

  
  remove: (id: string) => 
    api.delete<DeleteBookmarkResponse>(`/bookmarks/${id}`),
};