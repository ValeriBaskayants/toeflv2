import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { BookmarksApi } from '@/api/services/bookmarks';
import type {
  Bookmark,
  BookmarkType,
  ToggleBookmarkDto,
  ToggleBookmarkResponse,
  DeleteBookmarkResponse,
} from '@/types/bookmarks/Bookmarks.types';



export const fetchBookmarks = createAsyncThunk<
  Bookmark[],
  void,
  { rejectValue: string }
>(
  'bookmarks/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await BookmarksApi.getAll();
      return data;
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to load bookmarks',
      );
    }
  },
);

export const toggleBookmark = createAsyncThunk<
  ToggleBookmarkResponse & { dto: ToggleBookmarkDto },
  ToggleBookmarkDto,
  { rejectValue: string }
>(
  'bookmarks/toggle',
  async (dto, { rejectWithValue }) => {
    try {
      const { data } = await BookmarksApi.toggle(dto);
      return { ...data, dto };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to toggle bookmark',
      );
    }
  },
);

export const deleteBookmark = createAsyncThunk<
  DeleteBookmarkResponse & { id: string },
  string,
  { rejectValue: string }
>(
  'bookmarks/delete',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await BookmarksApi.remove(id);
      return { ...data, id };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to delete bookmark',
      );
    }
  },
);



type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

interface BookmarksState {
  list:        Bookmark[];
  listStatus:  AsyncStatus;
  listError:   string | null;

  toggleStatus: AsyncStatus;
  toggleError:  string | null;

  deleteStatus: AsyncStatus;
  deleteError:  string | null;
}

const initialState: BookmarksState = {
  list:        [],
  listStatus:  'idle',
  listError:   null,

  toggleStatus: 'idle',
  toggleError:  null,

  deleteStatus: 'idle',
  deleteError:  null,
};



const bookmarksSlice = createSlice({
  name: 'bookmarks',
  initialState,
  reducers: {
    clearBookmarksState: () => initialState,
  },
  extraReducers: (builder) => {
    builder

      
      .addCase(fetchBookmarks.pending, (state) => {
        state.listStatus = 'loading';
        state.listError  = null;
      })
      .addCase(fetchBookmarks.fulfilled, (state, action) => {
        state.list       = action.payload;
        state.listStatus = 'success';
      })
      .addCase(fetchBookmarks.rejected, (state, action) => {
        state.listStatus = 'error';
        state.listError  = action.payload ?? 'Unknown error';
      })

      
      .addCase(toggleBookmark.pending, (state) => {
        state.toggleStatus = 'loading';
        state.toggleError  = null;
      })
      .addCase(toggleBookmark.fulfilled, (state, action) => {
        state.toggleStatus = 'success';

        const { bookmarked, dto, bookmark } = action.payload;

        if (bookmarked) {
          
          
          if (bookmark !== undefined) {
            state.list.push(bookmark);
          }
        } else {
          state.list = state.list.filter(
            (item) => !(item.targetId === dto.targetId && item.type === dto.type),
          );
        }
      })
      .addCase(toggleBookmark.rejected, (state, action) => {
        state.toggleStatus = 'error';
        state.toggleError  = action.payload ?? 'Unknown error';
      })

      
      .addCase(deleteBookmark.pending, (state) => {
        state.deleteStatus = 'loading';
        state.deleteError  = null;
      })
      .addCase(deleteBookmark.fulfilled, (state, action) => {
        state.deleteStatus = 'success';
        state.list = state.list.filter((item) => item.id !== action.payload.id);
      })
      .addCase(deleteBookmark.rejected, (state, action) => {
        state.deleteStatus = 'error';
        state.deleteError  = action.payload ?? 'Unknown error';
      });
  },
});



export const { clearBookmarksState } = bookmarksSlice.actions;



export const bookmarksReducer = bookmarksSlice



interface BookmarksRootState {
  bookmarks: BookmarksState;
}

export const selectBookmarksList = (state: BookmarksRootState): Bookmark[] =>
  state.bookmarks.list;

export const selectBookmarksListStatus = (state: BookmarksRootState): AsyncStatus =>
  state.bookmarks.listStatus;

export const selectBookmarksListError = (state: BookmarksRootState): string | null =>
  state.bookmarks.listError;

export const selectToggleStatus = (state: BookmarksRootState): AsyncStatus =>
  state.bookmarks.toggleStatus;

export const selectDeleteStatus = (state: BookmarksRootState): AsyncStatus =>
  state.bookmarks.deleteStatus;



export const selectIsBookmarked =
  (targetId: string, type: BookmarkType) =>
  (state: BookmarksRootState): boolean =>
    state.bookmarks.list.some(
      (b) => b.targetId === targetId && b.type === type,
    );


export const selectBookmarksByType =
  (type: BookmarkType) =>
  (state: BookmarksRootState): Bookmark[] =>
    state.bookmarks.list.filter((b) => b.type === type);