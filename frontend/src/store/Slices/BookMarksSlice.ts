import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { BookmarksApi } from '@/api/services/bookmarks';
import type {
  EnrichedBookmark,
  BookmarkType,
  ToggleBookmarkDto,
  ToggleBookmarkResponse,
  DeleteBookmarkResponse,
  BookmarksFilterType,
} from '@/types/bookmarks/Bookmarks.types';



export const fetchBookmarks = createAsyncThunk<
  EnrichedBookmark[],
  BookmarkType | undefined,
  { rejectValue: string }
>('bookmarks/fetchAll', async (type, { rejectWithValue }) => {
  try {
    const { data } = await BookmarksApi.getAllEnriched(type);
    return data;
  } catch (error: unknown) {
    return rejectWithValue(
      error instanceof Error ? error.message : 'Failed to load bookmarks',
    );
  }
});

export const toggleBookmark = createAsyncThunk<
  ToggleBookmarkResponse & { dto: ToggleBookmarkDto },
  ToggleBookmarkDto,
  { rejectValue: string }
>('bookmarks/toggle', async (dto, { rejectWithValue }) => {
  try {
    const { data } = await BookmarksApi.toggle(dto);
    return { ...data, dto };
  } catch (error: unknown) {
    return rejectWithValue(
      error instanceof Error ? error.message : 'Failed to toggle bookmark',
    );
  }
});

export const deleteBookmark = createAsyncThunk<
  DeleteBookmarkResponse & { id: string },
  string,
  { rejectValue: string }
>('bookmarks/delete', async (id, { rejectWithValue }) => {
  try {
    const { data } = await BookmarksApi.remove(id);
    return { ...data, id };
  } catch (error: unknown) {
    return rejectWithValue(
      error instanceof Error ? error.message : 'Failed to delete bookmark',
    );
  }
});



type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

interface BookmarksState {
  list: EnrichedBookmark[];
  listStatus: AsyncStatus;
  listError: string | null;

  toggleStatus: AsyncStatus;
  toggleError: string | null;

  deleteStatus: AsyncStatus;
  deletingId: string | null; 
  deleteError: string | null;

  activeFilter: BookmarksFilterType;
}

const initialState: BookmarksState = {
  list: [],
  listStatus: 'idle',
  listError: null,

  toggleStatus: 'idle',
  toggleError: null,

  deleteStatus: 'idle',
  deletingId: null,
  deleteError: null,

  activeFilter: 'ALL',
};



const bookmarksSlice = createSlice({
  name: 'bookmarks',
  initialState,
  reducers: {
    clearBookmarksState: () => initialState,

    setActiveFilter(state, action: PayloadAction<BookmarksFilterType>) {
      state.activeFilter = action.payload;
    },

    
    optimisticRemove(state, action: PayloadAction<string>) {
      state.list = state.list.filter((b) => b.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    
    builder
      .addCase(fetchBookmarks.pending, (state) => {
        state.listStatus = 'loading';
        state.listError = null;
      })
      .addCase(fetchBookmarks.fulfilled, (state, action) => {
        state.list = action.payload;
        state.listStatus = 'success';
      })
      .addCase(fetchBookmarks.rejected, (state, action) => {
        state.listStatus = 'error';
        state.listError = action.payload ?? 'Unknown error';
      });

    
    builder
      .addCase(toggleBookmark.pending, (state) => {
        state.toggleStatus = 'loading';
        state.toggleError = null;
      })
      .addCase(toggleBookmark.fulfilled, (state, action) => {
        state.toggleStatus = 'success';
        const { bookmarked, bookmarkId, dto } = action.payload;

        if (bookmarked && bookmarkId !== null) {
          
          const placeholder: EnrichedBookmark = {
            id: bookmarkId,
            targetId: dto.targetId,
            type: dto.type,
            createdAt: new Date().toISOString(),
            data: null,
          };
          state.list.unshift(placeholder);
        } else {
          
          state.list = state.list.filter(
            (b) => !(b.targetId === dto.targetId && b.type === dto.type),
          );
        }
      })
      .addCase(toggleBookmark.rejected, (state, action) => {
        state.toggleStatus = 'error';
        state.toggleError = action.payload ?? 'Unknown error';
      });

    
    builder
      .addCase(deleteBookmark.pending, (state, action) => {
        state.deleteStatus = 'loading';
        state.deletingId = action.meta.arg; 
        state.deleteError = null;
      })
      .addCase(deleteBookmark.fulfilled, (state, action) => {
        state.deleteStatus = 'success';
        state.deletingId = null;
        
        state.list = state.list.filter((b) => b.id !== action.payload.id);
      })
      .addCase(deleteBookmark.rejected, (state, action) => {
        state.deleteStatus = 'error';
        state.deletingId = null;
        state.deleteError = action.payload ?? 'Unknown error';
      });
  },
});

export const { clearBookmarksState, setActiveFilter, optimisticRemove } = bookmarksSlice.actions;

export const bookmarksReducer = bookmarksSlice;



interface BookmarksRootState {
  bookmarks: BookmarksState;
}

export const selectBookmarksList = (s: BookmarksRootState): EnrichedBookmark[] =>
  s.bookmarks.list;

export const selectBookmarksListStatus = (s: BookmarksRootState): AsyncStatus =>
  s.bookmarks.listStatus;

export const selectBookmarksListError = (s: BookmarksRootState): string | null =>
  s.bookmarks.listError;

export const selectToggleStatus = (s: BookmarksRootState): AsyncStatus =>
  s.bookmarks.toggleStatus;

export const selectDeleteStatus = (s: BookmarksRootState): AsyncStatus =>
  s.bookmarks.deleteStatus;

export const selectDeletingId = (s: BookmarksRootState): string | null =>
  s.bookmarks.deletingId;

export const selectActiveFilter = (s: BookmarksRootState): BookmarksFilterType =>
  s.bookmarks.activeFilter;

/** True if targetId+type combo exists in the list */
export const selectIsBookmarked =
  (targetId: string, type: BookmarkType) =>
  (s: BookmarksRootState): boolean =>
    s.bookmarks.list.some((b) => b.targetId === targetId && b.type === type);

/** All bookmarks of a given type */
export const selectBookmarksByType =
  (type: BookmarkType) =>
  (s: BookmarksRootState): EnrichedBookmark[] =>
    s.bookmarks.list.filter((b) => b.type === type);

/** Filtered list based on activeFilter */
export const selectFilteredBookmarks = (s: BookmarksRootState): EnrichedBookmark[] => {
  const { list, activeFilter } = s.bookmarks;
  return activeFilter === 'ALL' ? list : list.filter((b) => b.type === activeFilter);
};

/** Count per type — for filter tabs and stats */
export const selectCountByType = (
  s: BookmarksRootState,
): Record<BookmarkType, number> => {
  const counts = {
    GRAMMAR_RULE: 0,
    VOCABULARY: 0,
    READING: 0,
    WRITING_PROMPT: 0,
    LISTENING: 0,
  };
  for (const b of s.bookmarks.list) {
    counts[b.type] += 1;
  }
  return counts;
};