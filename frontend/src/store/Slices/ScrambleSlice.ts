// frontend/src/store/Slices/ScrambleSlice.ts
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { scrambleApi, type GetScrambleParams } from '@/api/services/scramble';
import type {
  ScrambleExerciseSummary,
  ScrambleExerciseDetail,
  ScrambleSubmitResult,
  ScrambleMode,
} from '@/types/scramble/Scramble.types';

interface ScrambleState {
  catalog: ScrambleExerciseSummary[];
  catalogLoading: boolean;
  catalogError: string | null;

  filters: { level: string | null; topic: string | null };

  queue: ScrambleExerciseSummary[];
  queueIndex: number;
  mistakes: ScrambleExerciseSummary[];
  completed: ScrambleExerciseSummary[];

  currentExercise: ScrambleExerciseDetail | null;
  currentSessionId: string | null;
  currentMode: ScrambleMode | null;
  exerciseLoading: boolean;
  exerciseError: string | null;
  startedAtMs: number | null;

  lastResult: ScrambleSubmitResult | null;
  submitting: boolean;
  submitError: string | null;
}

const initialState: ScrambleState = {
  catalog: [],
  catalogLoading: false,
  catalogError: null,
  filters: { level: null, topic: null },
  queue: [],
  queueIndex: 0,
  mistakes: [],
  completed: [],
  currentExercise: null,
  currentSessionId: null,
  currentMode: null,
  exerciseLoading: false,
  exerciseError: null,
  startedAtMs: null,
  lastResult: null,
  submitting: false,
  submitError: null,
};

interface RejectValue {
  rejectValue: string;
}

interface LoadQueueItemResult {
  exercise: ScrambleExerciseDetail;
  sessionId: string;
  mode: ScrambleMode;
}

interface SubmitPayload {
  wordOrder: string[];
  usedHint: boolean;
}

interface SubmitThunkConfig extends RejectValue {
  state: { scramble: ScrambleState };
}

export const fetchScrambleCatalog = createAsyncThunk<ScrambleExerciseSummary[], GetScrambleParams | undefined, RejectValue>(
  'scramble/fetchCatalog',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await scrambleApi.getExercises(params);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to load exercises');
    }
  },
);

export const loadQueueItem = createAsyncThunk<LoadQueueItemResult, ScrambleExerciseSummary, RejectValue>(
  'scramble/loadQueueItem',
  async (item, { rejectWithValue }) => {
    const mode = item.allowedModes[0];

    if (mode === undefined) {
      return rejectWithValue('Exercise has no available modes');
    }

    try {
      const { data: exercise } = await scrambleApi.getExerciseById(item.id, mode);
      const { data: session } = await scrambleApi.startSession({ exerciseId: item.id, mode });
      return { exercise, sessionId: session.id, mode: session.mode };
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to load exercise');
    }
  },
);

export const submitCurrentAnswer = createAsyncThunk<ScrambleSubmitResult, SubmitPayload, SubmitThunkConfig>(
  'scramble/submit',
  async (payload, { getState, rejectWithValue }) => {
    const state = getState().scramble;

    if (state.currentSessionId === null || state.startedAtMs === null) {
      return rejectWithValue('No active session');
    }

    try {
      const timeSpentSec = Math.round((Date.now() - state.startedAtMs) / 1000);
      const { data } = await scrambleApi.submitAnswer(state.currentSessionId, {
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

export const scrambleSlice = createSlice({
  name: 'scramble',
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<{ key: 'level' | 'topic'; value: string | null }>) => {
      state.filters[action.payload.key] = action.payload.value;
    },

    startQueue: (state, action: PayloadAction<ScrambleExerciseSummary[]>) => {
      state.queue = action.payload;
      state.queueIndex = 0;
      state.mistakes = [];
      state.completed = [];
      state.lastResult = null;
    },

    advanceQueue: (state) => {
      const current = state.queue[state.queueIndex];
      if (current !== undefined && state.lastResult !== null) {
        if (state.lastResult.isCorrect) {
          state.completed.push(current);
        } else {
          state.mistakes.push(current);
        }
      }

      state.queueIndex += 1;
      state.currentExercise = null;
      state.currentSessionId = null;
      state.currentMode = null;
      state.startedAtMs = null;
      state.lastResult = null;
    },

    resetSession: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchScrambleCatalog.pending, (state) => {
        state.catalogLoading = true;
        state.catalogError = null;
      })
      .addCase(fetchScrambleCatalog.fulfilled, (state, action) => {
        state.catalogLoading = false;
        state.catalog = action.payload;
      })
      .addCase(fetchScrambleCatalog.rejected, (state, action) => {
        state.catalogLoading = false;
        state.catalogError = action.payload ?? 'Unknown error';
      });

    builder
      .addCase(loadQueueItem.pending, (state) => {
        state.exerciseLoading = true;
        state.exerciseError = null;
      })
      .addCase(loadQueueItem.fulfilled, (state, action) => {
        state.exerciseLoading = false;
        state.currentExercise = action.payload.exercise;
        state.currentSessionId = action.payload.sessionId;
        state.currentMode = action.payload.mode;
        state.startedAtMs = Date.now();
      })
      .addCase(loadQueueItem.rejected, (state, action) => {
        state.exerciseLoading = false;
        state.exerciseError = action.payload ?? 'Unknown error';
      });

    builder
      .addCase(submitCurrentAnswer.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(submitCurrentAnswer.fulfilled, (state, action) => {
        state.submitting = false;
        state.lastResult = action.payload;
      })
      .addCase(submitCurrentAnswer.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload ?? 'Unknown error';
      });
  },
});

export const { setFilter, startQueue, advanceQueue, resetSession } = scrambleSlice.actions;