import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { RoadmapResponse } from '@/types/roadmap/Roadmap.types';
import { roadmapApi } from '@/api/services/roadmap';

interface RoadmapState {
  data:      RoadmapResponse | null;
  isLoading: boolean;
  error:     string | null;
}

const initialState: RoadmapState = {
  data:      null,
  isLoading: false,
  error:     null,
};

export const fetchRoadmap = createAsyncThunk<
  RoadmapResponse,
  void,
  { rejectValue: string }
>(
  'roadmap/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await roadmapApi.getRoadmap();
      return data;
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to load roadmap',
      );
    }
  },
);

export const roadmapSlice = createSlice({
  name: 'roadmap',
  initialState,
  reducers: {
    clearRoadmap: (state) => {
      state.data      = null;
      state.error     = null;
      state.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoadmap.pending, (state) => {
        state.isLoading = true;
        state.error     = null;
      })
      .addCase(fetchRoadmap.fulfilled, (state, action) => {
        state.data      = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchRoadmap.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload ?? 'Unknown error';
      });
  },
});

export const { clearRoadmap } = roadmapSlice.actions;

export interface RoadmapRootState {
  roadmap: RoadmapState;
}

export const selectRoadmapData      = (s: RoadmapRootState) => s.roadmap.data;
export const selectRoadmapLoading   = (s: RoadmapRootState) => s.roadmap.isLoading;
export const selectRoadmapError     = (s: RoadmapRootState) => s.roadmap.error;