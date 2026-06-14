import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { mistakesApi } from '@/api/services/mistakes';
import type { UserMistake, WeakSpot } from '@/types/mistakes/Mistakes.types';

// ─── State ────────────────────────────────────────────────────────────────────

interface MistakesState {
  mistakes: UserMistake[];
  weakSpots: WeakSpot[];
  isLoading: boolean;
  weakSpotsLoading: boolean;
  error: string | null;

  // All filtering is done client-side to avoid multiple API calls
  filters: {
    source: string | null; // QUIZ | WRITING | READING | LISTENING | null
    category: string | null; // GRAMMAR | VOCABULARY | SPELLING | LOGIC | null
    status: string | null; // LEARNING | REVIEWING | MASTERED | null
    search: string; // free-text match on topic
  };
}

const initialState: MistakesState = {
  mistakes: [],
  weakSpots: [],
  isLoading: false,
  weakSpotsLoading: false,
  error: null,
  filters: {
    source: null,
    category: null,
    status: null,
    search: '',
  },
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchMistakes = createAsyncThunk<UserMistake[], void, { rejectValue: string }>(
  'mistakes/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await mistakesApi.getAll();
      return data;
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to load mistakes');
    }
  },
);

export const fetchWeakSpots = createAsyncThunk<WeakSpot[], void, { rejectValue: string }>(
  'mistakes/fetchWeakSpots',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await mistakesApi.getWeakSpots();
      return data;
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to load weak spots');
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

export const mistakesSlice = createSlice({
  name: 'mistakes',
  initialState,
  reducers: {
    setFilter: (
      state,
      action: PayloadAction<{
        key: 'source' | 'category' | 'status' | 'search';
        value: string | null;
      }>,
    ) => {
      const { key, value } = action.payload;
      if (key === 'search') {
        state.filters.search = value ?? '';
      } else {
        state.filters[key] = value;
      }
    },

    resetFilters: (state) => {
      state.filters = { source: null, category: null, status: null, search: '' };
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchMistakes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMistakes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.mistakes = action.payload;
      })
      .addCase(fetchMistakes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Unknown error';
      });

    builder
      .addCase(fetchWeakSpots.pending, (state) => {
        state.weakSpotsLoading = true;
      })
      .addCase(fetchWeakSpots.fulfilled, (state, action) => {
        state.weakSpotsLoading = false;
        state.weakSpots = action.payload;
      })
      .addCase(fetchWeakSpots.rejected, (state) => {
        state.weakSpotsLoading = false;
      });
  },
});

export const { setFilter, resetFilters } = mistakesSlice.actions;

// ─── Derived selector — filtered mistakes ─────────────────────────────────────

import type { RootState } from '@/store/store';
import { isDueForReview } from '@/types/mistakes/Mistakes.types';

export function selectFilteredMistakes(state: RootState): UserMistake[] {
  const { mistakes, filters } = state.mistakes;
  return mistakes.filter((m) => {
    if (filters.source && m.source !== filters.source) return false;
    if (filters.category && m.category !== filters.category) return false;
    if (filters.status && m.status !== filters.status) return false;
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      if (!m.topic.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export function selectDueCount(state: RootState): number {
  return state.mistakes.mistakes.filter(isDueForReview).length;
}

export function selectMasteredCount(state: RootState): number {
  return state.mistakes.mistakes.filter((m) => m.status === 'MASTERED').length;
}

export function selectOverallAccuracy(state: RootState): number {
  const all = state.mistakes.mistakes;
  const totalWrong = all.reduce((s, m) => s + m.wrongCount, 0);
  const totalCorrect = all.reduce((s, m) => s + m.correctCount, 0);
  const total = totalWrong + totalCorrect;
  return total > 0 ? Math.round((totalCorrect / total) * 100) : 0;
}
