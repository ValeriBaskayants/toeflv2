
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { mistakesApi } from '@/api/services/mistakes';
import type {
  UserMistake,
  WeakSpot,
  HeatmapCell,
  DueMistake,
} from '@/types/mistakes/Mistakes.types';



interface MistakesState {
  mistakes: UserMistake[];
  weakSpots: WeakSpot[];
  heatmap: HeatmapCell[];
  dueMistakes: DueMistake[];

  isLoading: boolean;
  weakSpotsLoading: boolean;
  heatmapLoading: boolean;
  /** per-id loading state for markMastered */
  markMasteredLoading: Record<string, boolean>;

  error: string | null;

  filters: {
    source: string | null;
    category: string | null;
    status: string | null;
    search: string;
  };
}

const initialState: MistakesState = {
  mistakes: [],
  weakSpots: [],
  heatmap: [],
  dueMistakes: [],

  isLoading: false,
  weakSpotsLoading: false,
  heatmapLoading: false,
  markMasteredLoading: {},

  error: null,

  filters: {
    source: null,
    category: null,
    status: null,
    search: '',
  },
};



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

export const fetchHeatmap = createAsyncThunk<HeatmapCell[], void, { rejectValue: string }>(
  'mistakes/fetchHeatmap',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await mistakesApi.getHeatmap();
      return data;
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to load heatmap');
    }
  },
);

export const fetchDueForReview = createAsyncThunk<DueMistake[], number | undefined, { rejectValue: string }>(
  'mistakes/fetchDue',
  async (limit, { rejectWithValue }) => {
    try {
      const { data } = await mistakesApi.getDueForReview(limit);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to load due items');
    }
  },
);

/** Optimistic: immediately flips status in store, no re-fetch needed */
export const markMistakeMastered = createAsyncThunk<string, string, { rejectValue: string }>(
  'mistakes/markMastered',
  async (mistakeId, { rejectWithValue }) => {
    try {
      await mistakesApi.markMastered(mistakeId);
      return mistakeId;
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to mark mastered');
    }
  },
);



export const mistakesSlice = createSlice({
  name: 'mistakes',
  initialState,
  reducers: {
    setFilter: (
      state,
      action: PayloadAction<{ key: 'source' | 'category' | 'status' | 'search'; value: string | null }>,
    ) => {
      const { key, value } = action.payload;
      if (key === 'search') state.filters.search = value ?? '';
      else state.filters[key] = value;
    },

    resetFilters: (state) => {
      state.filters = { source: null, category: null, status: null, search: '' };
    },
  },

  extraReducers: (builder) => {
    
    builder
      .addCase(fetchMistakes.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchMistakes.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.mistakes = payload;
      })
      .addCase(fetchMistakes.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? 'Unknown error';
      });

    
    builder
      .addCase(fetchWeakSpots.pending,    (state) => { state.weakSpotsLoading = true; })
      .addCase(fetchWeakSpots.fulfilled,  (state, { payload }) => { state.weakSpotsLoading = false; state.weakSpots = payload; })
      .addCase(fetchWeakSpots.rejected,   (state) => { state.weakSpotsLoading = false; });

    
    builder
      .addCase(fetchHeatmap.pending,    (state) => { state.heatmapLoading = true; })
      .addCase(fetchHeatmap.fulfilled,  (state, { payload }) => { state.heatmapLoading = false; state.heatmap = payload; })
      .addCase(fetchHeatmap.rejected,   (state) => { state.heatmapLoading = false; });

    
    builder
      .addCase(fetchDueForReview.fulfilled, (state, { payload }) => { state.dueMistakes = payload; });

    
    builder
      .addCase(markMistakeMastered.pending, (state, { meta }) => {
        state.markMasteredLoading[meta.arg] = true;
      })
      .addCase(markMistakeMastered.fulfilled, (state, { payload: id }) => {
        delete state.markMasteredLoading[id];
        const m = state.mistakes.find((x) => x.id === id);
        if (m) {
          m.status = 'MASTERED' as UserMistake['status'];
          m.nextReview = null;
          m.dueForReview = false;
        }
      })
      .addCase(markMistakeMastered.rejected, (state, { meta }) => {
        delete state.markMasteredLoading[meta.arg];
      });
  },
});

export const { setFilter, resetFilters } = mistakesSlice.actions;



import type { RootState } from '@/store/store';
import { isDueForReview } from '@/types/mistakes/Mistakes.types';

export const selectFilteredMistakes = (state: RootState): UserMistake[] => {
  const { mistakes, filters } = state.mistakes;
  return mistakes.filter((m) => {
    if (filters.source   && m.source   !== filters.source)   return false;
    if (filters.category && m.category !== filters.category) return false;
    if (filters.status   && m.status   !== filters.status)   return false;
    if (filters.search.trim()) {
      if (!m.topic.toLowerCase().includes(filters.search.toLowerCase())) return false;
    }
    return true;
  });
};

export const selectDueCount = (state: RootState): number =>
  state.mistakes.mistakes.filter(isDueForReview).length;

export const selectMasteredCount = (state: RootState): number =>
  state.mistakes.mistakes.filter((m) => m.status === 'MASTERED').length;

export const selectOverallAccuracy = (state: RootState): number => {
  const all = state.mistakes.mistakes;
  const totalWrong   = all.reduce((s, m) => s + m.wrongCount,   0);
  const totalCorrect = all.reduce((s, m) => s + m.correctCount, 0);
  const total = totalWrong + totalCorrect;
  return total > 0 ? Math.round((totalCorrect / total) * 100) : 0;
};

export const selectIsMarkMasteredLoading = (id: string) => (state: RootState): boolean =>
  !!state.mistakes.markMasteredLoading[id];