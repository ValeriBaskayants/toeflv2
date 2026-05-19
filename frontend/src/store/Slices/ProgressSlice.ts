import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { DashboardData, LevelUpResult } from '@/types/progress/Progress.types';
import { progressApi } from '@/api/services/progress';

interface ProgressState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  isLevelingUp: boolean;
  levelUpError: string | null;
}

const initialState: ProgressState = {
  data: null,
  isLoading: false,
  error: null,
  isLevelingUp: false,
  levelUpError: null,
};

export const fetchDashboard = createAsyncThunk<DashboardData, void, { rejectValue: string }>(
  'progress/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await progressApi.getDashboard();
      return data;
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch dashboard');
    }
  },
);

export const requestLevelUp = createAsyncThunk<LevelUpResult | null, void, { rejectValue: string }>(
  'progress/levelUp',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await progressApi.levelUp();
      return data;
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to level up');
    }
  },
);

export const progressSlice = createSlice({
  name: 'progress',
  initialState,
  reducers: {
    clearProgress: (state) => {
      state.data = null;
      state.error = null;
      state.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.data = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Unknown error';
      })
      .addCase(requestLevelUp.pending, (state) => {
        state.isLevelingUp = true;
        state.levelUpError = null;
      })
      .addCase(requestLevelUp.fulfilled, (state) => {
        state.isLevelingUp = false;
        state.data = null;
      })
      .addCase(requestLevelUp.rejected, (state, action) => {
        state.isLevelingUp = false;
        state.levelUpError = action.payload ?? 'Unknown error';
      });
  },
});

export const { clearProgress } = progressSlice.actions;

export interface ProgressRootState {
  progress: ProgressState;
}

export const selectProgressData = (state: ProgressRootState): DashboardData | null =>
  state.progress.data;

export const selectProgressIsLoading = (state: ProgressRootState): boolean =>
  state.progress.isLoading;

export const selectProgressError = (state: ProgressRootState): string | null =>
  state.progress.error;

export const selectIsLevelingUp = (state: ProgressRootState): boolean =>
  state.progress.isLevelingUp;

export const selectLevelUpError = (state: ProgressRootState): string | null =>
  state.progress.levelUpError;
