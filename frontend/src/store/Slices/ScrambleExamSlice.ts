import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { scrambleApi } from '@/api/services/scramble';
import type { ScrambleBlockItem, ScrambleBlockReview } from '@/types/scramble/Scramble.types';
import type { Level } from '@/types/globalTypes';

interface ScrambleExamState {
  blockId: string | null;
  startedAtMs: number | null;
  totalTimeBudgetSec: number | null;
  currentItem: ScrambleBlockItem | null;
  itemStartedAtMs: number | null;
  isStarting: boolean;
  isSubmitting: boolean;
  error: string | null;
  finished: boolean;
  timedOut: boolean;
  correctCount: number | null;
  finalScorePercent: number | null;
  xpEarned: number | null;
  review: ScrambleBlockReview | null;
  reviewLoading: boolean;
}

const initialState: ScrambleExamState = {
  blockId: null,
  startedAtMs: null,
  totalTimeBudgetSec: null,
  currentItem: null,
  itemStartedAtMs: null,
  isStarting: false,
  isSubmitting: false,
  error: null,
  finished: false,
  timedOut: false,
  correctCount: null,
  finalScorePercent: null,
  xpEarned: null,
  review: null,
  reviewLoading: false,
};

interface RejectValue {
  rejectValue: string;
}

interface StartResult {
  blockId: string;
  startedAtMs: number;
  totalTimeBudgetSec: number;
  item: ScrambleBlockItem;
}

export const startScrambleExam = createAsyncThunk<StartResult, Level, RejectValue>(
  'scrambleExam/start',
  async (level, { rejectWithValue }) => {
    try {
      const { data } = await scrambleApi.startBlock(level);
      return {
        blockId: data.blockId,
        startedAtMs: new Date(data.startedAt).getTime(),
        totalTimeBudgetSec: data.totalTimeBudgetSec,
        item: data.item,
      };
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to start the test');
    }
  },
);

export const resumeScrambleExam = createAsyncThunk<StartResult, string, RejectValue>(
  'scrambleExam/resume',
  async (blockId, { rejectWithValue }) => {
    try {
      const { data } = await scrambleApi.getCurrentBlockItem(blockId);
      return {
        blockId,
        startedAtMs: new Date(data.startedAt).getTime(),
        totalTimeBudgetSec: data.totalTimeBudgetSec,
        item: data,
      };
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to resume the test');
    }
  },
);

interface SubmitExamItemPayload {
  wordOrder: string[];
  usedHint: boolean;
}
interface ExamThunkConfig extends RejectValue {
  state: { scrambleExam: ScrambleExamState };
}

interface SubmitResult {
  blockCompleted: boolean;
  nextItem: ScrambleBlockItem | null;
  correctCount?: number;
  finalScorePercent?: number;
  xpEarned?: number;
}

export const submitScrambleExamItem = createAsyncThunk<SubmitResult, SubmitExamItemPayload, ExamThunkConfig>(
  'scrambleExam/submitItem',
  async (payload, { getState, rejectWithValue }) => {
    const { blockId, itemStartedAtMs } = getState().scrambleExam;
    if (blockId === null || itemStartedAtMs === null) {
      return rejectWithValue('No active test session');
    }

    try {
      const timeSpentSec = Math.round((Date.now() - itemStartedAtMs) / 1000);
      const { data } = await scrambleApi.submitBlockItem(blockId, {
        wordOrder: payload.wordOrder,
        timeSpentSec,
        usedHint: payload.usedHint,
      });
      return data;
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to submit answer');
    }
  },
);

interface ExpireResult {
  correctCount: number;
  finalScorePercent: number;
  xpEarned: number;
}

export const expireScrambleExam = createAsyncThunk<ExpireResult, void, ExamThunkConfig>(
  'scrambleExam/expire',
  async (_, { getState, rejectWithValue }) => {
    const { blockId } = getState().scrambleExam;
    if (blockId === null) return rejectWithValue('No active test session');

    try {
      const { data } = await scrambleApi.expireBlock(blockId);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to end the test');
    }
  },
);

export const fetchScrambleExamReview = createAsyncThunk<ScrambleBlockReview, string, RejectValue>(
  'scrambleExam/fetchReview',
  async (blockId, { rejectWithValue }) => {
    try {
      const { data } = await scrambleApi.getBlockReview(blockId);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to load the review');
    }
  },
);

export const scrambleExamSlice = createSlice({
  name: 'scrambleExam',
  initialState,
  reducers: {
    resetExam: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(startScrambleExam.pending, (state) => {
        state.isStarting = true;
        state.error = null;
      })
      .addCase(startScrambleExam.fulfilled, (state, action) => {
        state.isStarting = false;
        state.blockId = action.payload.blockId;
        state.startedAtMs = action.payload.startedAtMs;
        state.totalTimeBudgetSec = action.payload.totalTimeBudgetSec;
        state.currentItem = action.payload.item;
        state.itemStartedAtMs = Date.now();
      })
      .addCase(startScrambleExam.rejected, (state, action) => {
        state.isStarting = false;
        state.error = action.payload ?? 'Unknown error';
      });

    builder
      .addCase(resumeScrambleExam.pending, (state) => {
        state.isStarting = true;
        state.error = null;
      })
      .addCase(resumeScrambleExam.fulfilled, (state, action) => {
        state.isStarting = false;
        state.blockId = action.payload.blockId;
        state.startedAtMs = action.payload.startedAtMs;
        state.totalTimeBudgetSec = action.payload.totalTimeBudgetSec;
        state.currentItem = action.payload.item;
        state.itemStartedAtMs = Date.now();
      })
      .addCase(resumeScrambleExam.rejected, (state, action) => {
        state.isStarting = false;
        state.error = action.payload ?? 'Unknown error';
      });

    builder
      .addCase(submitScrambleExamItem.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(submitScrambleExamItem.fulfilled, (state, action) => {
        state.isSubmitting = false;
        if (action.payload.blockCompleted) {
          state.finished = true;
          state.currentItem = null;
          state.correctCount = action.payload.correctCount ?? null;
          state.finalScorePercent = action.payload.finalScorePercent ?? null;
          state.xpEarned = action.payload.xpEarned ?? null;
        } else {
          state.currentItem = action.payload.nextItem;
          state.itemStartedAtMs = Date.now();
        }
      })
      .addCase(submitScrambleExamItem.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload ?? 'Unknown error';
      });

    builder.addCase(expireScrambleExam.fulfilled, (state, action) => {
      state.finished = true;
      state.timedOut = true;
      state.currentItem = null;
      state.correctCount = action.payload.correctCount;
      state.finalScorePercent = action.payload.finalScorePercent;
      state.xpEarned = action.payload.xpEarned;
    });

    builder
      .addCase(fetchScrambleExamReview.pending, (state) => {
        state.reviewLoading = true;
      })
      .addCase(fetchScrambleExamReview.fulfilled, (state, action) => {
        state.reviewLoading = false;
        state.review = action.payload;
      })
      .addCase(fetchScrambleExamReview.rejected, (state) => {
        state.reviewLoading = false;
      });
  },
});

export const { resetExam } = scrambleExamSlice.actions;