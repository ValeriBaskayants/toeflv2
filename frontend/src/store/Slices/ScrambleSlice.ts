import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { scrambleApi } from '@/api/services/scramble';
import type {
  ScrambleBlockKind,
  ScrambleBlockItem,
  ScrambleBlockStart,
  ScrambleFreeNavItemsResponse,
  ScrambleLinearSubmitResult,
  ScrambleDraftAnswer,
  ScrambleFinishResult,
  ScrambleBlockReview,
} from '@/types/scramble/Scramble.types';
import type { Level } from '@/types/globalTypes';

interface ScrambleState {
  blockId: string | null;
  kind: ScrambleBlockKind | null;
  freeNavigation: boolean | null;
  startedAtMs: number | null;

  totalTimeBudgetSec: number | null;
  items: ScrambleBlockItem[];
  drafts: Record<string, ScrambleDraftAnswer>;
  activeIndex: number;

  currentItem: ScrambleBlockItem | null;
  itemStartedAtMs: number | null;
  lastLinearFeedback: { isCorrect: boolean; correctSentence: string } | null;

  isStarting: boolean;
  isSubmitting: boolean;
  isSavingDraft: boolean;
  error: string | null;

  finished: boolean;
  timedOut: boolean;
  correctCount: number | null;
  finalScorePercent: number | null;
  xpEarned: number | null;

  review: ScrambleBlockReview | null;
  reviewLoading: boolean;
}

const initialState: ScrambleState = {
  blockId: null,
  kind: null,
  freeNavigation: null,
  startedAtMs: null,
  totalTimeBudgetSec: null,
  items: [],
  drafts: {},
  activeIndex: 0,
  currentItem: null,
  itemStartedAtMs: null,
  lastLinearFeedback: null,
  isStarting: false,
  isSubmitting: false,
  isSavingDraft: false,
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

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

// --- Thunks: каждый ВОЗВРАЩАЕТ данные ответа, ни один не диспатчит изнутри себя ---

export const startPracticeSet = createAsyncThunk<ScrambleBlockStart, { level: Level; count: number }, RejectValue>(
  'scramble/startPracticeSet',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await scrambleApi.startPracticeSet(params.level, params.count);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to start practice'));
    }
  },
);

export const startExam = createAsyncThunk<ScrambleBlockStart, void, RejectValue>(
  'scramble/startExam',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await scrambleApi.startExam();
      return data;
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to start the test'));
    }
  },
);

export const resumeFreeNavBlock = createAsyncThunk<ScrambleFreeNavItemsResponse, string, RejectValue>(
  'scramble/resumeFreeNavBlock',
  async (blockId, { rejectWithValue }) => {
    try {
      const { data } = await scrambleApi.getBlockItems(blockId);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to resume the test'));
    }
  },
);

interface LinearResumeResult {
  blockId: string;
  item: ScrambleBlockItem;
}

export const resumeLinearBlock = createAsyncThunk<LinearResumeResult, string, RejectValue>(
  'scramble/resumeLinearBlock',
  async (blockId, { rejectWithValue }) => {
    try {
      const { data } = await scrambleApi.getCurrentBlockItem(blockId);
      return { blockId, item: data };
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to resume practice'));
    }
  },
);

interface SubmitLinearPayload {
  wordOrder: string[];
  filledBlanks?: Array<{ position: number; text: string }>;
  usedHint: boolean;
}
interface SliceThunkConfig extends RejectValue {
  state: { scramble: ScrambleState };
}

export const submitLinearItem = createAsyncThunk<ScrambleLinearSubmitResult, SubmitLinearPayload, SliceThunkConfig>(
  'scramble/submitLinearItem',
  async (payload, { getState, rejectWithValue }) => {
    const { blockId, itemStartedAtMs } = getState().scramble;
    if (blockId === null || itemStartedAtMs === null) {
      return rejectWithValue('No active session');
    }

    try {
      const timeSpentSec = Math.round((Date.now() - itemStartedAtMs) / 1000);
      const { data } = await scrambleApi.submitBlockItem(blockId, { ...payload, timeSpentSec });
      return data;
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to submit answer'));
    }
  },
);

interface SaveDraftPayload {
  exerciseId: string;
  wordOrder: string[];
  filledBlanks?: Array<{ position: number; text: string }>;
  usedHint: boolean;
}

export const saveDraft = createAsyncThunk<ScrambleDraftAnswer, SaveDraftPayload, SliceThunkConfig>(
  'scramble/saveDraft',
  async (payload, { getState, rejectWithValue }) => {
    const { blockId } = getState().scramble;
    if (blockId === null) return rejectWithValue('No active session');

    try {
      await scrambleApi.saveDraft(blockId, payload);
      return {
        exerciseId: payload.exerciseId,
        wordOrder: payload.wordOrder,
        filledBlanks: payload.filledBlanks ?? [],
        usedHint: payload.usedHint,
        updatedAt: new Date().toISOString(),
      };
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to save your answer'));
    }
  },
);

export const finishBlock = createAsyncThunk<ScrambleFinishResult, void, SliceThunkConfig>(
  'scramble/finishBlock',
  async (_, { getState, rejectWithValue }) => {
    const { blockId } = getState().scramble;
    if (blockId === null) return rejectWithValue('No active session');

    try {
      const { data } = await scrambleApi.finishBlock(blockId);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to submit the test'));
    }
  },
);

export const expireBlock = createAsyncThunk<ScrambleFinishResult, void, SliceThunkConfig>(
  'scramble/expireBlock',
  async (_, { getState, rejectWithValue }) => {
    const { blockId } = getState().scramble;
    if (blockId === null) return rejectWithValue('No active session');

    try {
      const { data } = await scrambleApi.expireBlock(blockId);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to end the test'));
    }
  },
);

export const fetchBlockReview = createAsyncThunk<ScrambleBlockReview, string, RejectValue>(
  'scramble/fetchReview',
  async (blockId, { rejectWithValue }) => {
    try {
      const { data } = await scrambleApi.getBlockReview(blockId);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to load the review'));
    }
  },
);

// --- Вспомогательные мутаторы состояния (переиспользуются в нескольких .fulfilled) ---

function applyBlockStart(state: ScrambleState, data: ScrambleBlockStart): void {
  state.blockId = data.blockId;
  state.kind = data.kind;
  state.freeNavigation = data.freeNavigation;
  state.startedAtMs = new Date(data.startedAt).getTime();
  state.finished = false;
  state.timedOut = false;
  state.review = null;
  state.correctCount = null;
  state.finalScorePercent = null;
  state.xpEarned = null;

  if (data.freeNavigation) {
    state.totalTimeBudgetSec = data.totalTimeBudgetSec;
    state.items = data.items;
    state.drafts = {};
    state.activeIndex = 0;
    state.currentItem = null;
    state.itemStartedAtMs = null;
  } else {
    state.currentItem = data.item;
    state.itemStartedAtMs = Date.now();
    state.items = [];
    state.drafts = {};
    state.totalTimeBudgetSec = null;
  }
}

function applyFinish(state: ScrambleState, data: ScrambleFinishResult): void {
  state.finished = true;
  state.timedOut = data.timedOut;
  state.currentItem = null;
  state.correctCount = data.correctCount;
  state.finalScorePercent = data.finalScorePercent;
  state.xpEarned = data.xpEarned;
}

export const scrambleSlice = createSlice({
  name: 'scramble',
  initialState,
  reducers: {
    setActiveIndex: (state, action: PayloadAction<number>) => {
      state.activeIndex = Math.max(0, Math.min(state.items.length - 1, action.payload));
    },
    clearLinearFeedback: (state) => {
      state.lastLinearFeedback = null;
    },
    resetScramble: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(startPracticeSet.pending, (state) => { state.isStarting = true; state.error = null; })
      .addCase(startPracticeSet.fulfilled, (state, action) => {
        state.isStarting = false;
        applyBlockStart(state, action.payload);
      })
      .addCase(startPracticeSet.rejected, (state, action) => { state.isStarting = false; state.error = action.payload ?? 'Unknown error'; });

    builder
      .addCase(startExam.pending, (state) => { state.isStarting = true; state.error = null; })
      .addCase(startExam.fulfilled, (state, action) => {
        state.isStarting = false;
        applyBlockStart(state, action.payload);
      })
      .addCase(startExam.rejected, (state, action) => { state.isStarting = false; state.error = action.payload ?? 'Unknown error'; });

    builder
      .addCase(resumeFreeNavBlock.pending, (state) => { state.isStarting = true; state.error = null; })
      .addCase(resumeFreeNavBlock.fulfilled, (state, action) => {
        state.isStarting = false;
        const d = action.payload;
        state.blockId = d.blockId;
        state.kind = d.kind;
        state.freeNavigation = true;
        state.startedAtMs = new Date(d.startedAt).getTime();
        state.totalTimeBudgetSec = d.totalTimeBudgetSec;
        state.items = d.items;
        state.drafts = Object.fromEntries(d.draftAnswers.map((dr) => [dr.exerciseId, dr]));
        state.activeIndex = 0;
        state.finished = false;
      })
      .addCase(resumeFreeNavBlock.rejected, (state, action) => { state.isStarting = false; state.error = action.payload ?? 'Unknown error'; });

    builder
      .addCase(resumeLinearBlock.pending, (state) => { state.isStarting = true; state.error = null; })
      .addCase(resumeLinearBlock.fulfilled, (state, action) => {
        state.isStarting = false;
        state.blockId = action.payload.blockId;
        state.kind = 'PRACTICE_SET';
        state.freeNavigation = false;
        state.currentItem = action.payload.item;
        state.itemStartedAtMs = Date.now();
        state.finished = false;
      })
      .addCase(resumeLinearBlock.rejected, (state, action) => { state.isStarting = false; state.error = action.payload ?? 'Unknown error'; });

    builder
      .addCase(submitLinearItem.pending, (state) => { state.isSubmitting = true; state.error = null; })
      .addCase(submitLinearItem.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const data = action.payload;
        state.lastLinearFeedback = { isCorrect: data.isCorrect, correctSentence: data.correctSentence };
        if (data.blockCompleted) {
          state.finished = true;
          state.currentItem = null;
          state.correctCount = data.correctCount ?? null;
          state.finalScorePercent = data.finalScorePercent ?? null;
          state.xpEarned = data.xpEarned ?? null;
        } else {
          state.currentItem = data.nextItem;
          state.itemStartedAtMs = Date.now();
        }
      })
      .addCase(submitLinearItem.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload ?? 'Unknown error'; });

    builder
      .addCase(saveDraft.pending, (state) => { state.isSavingDraft = true; })
      .addCase(saveDraft.fulfilled, (state, action) => {
        state.isSavingDraft = false;
        state.drafts[action.payload.exerciseId] = action.payload;
      })
      .addCase(saveDraft.rejected, (state, action) => { state.isSavingDraft = false; state.error = action.payload ?? 'Unknown error'; });

    builder
      .addCase(finishBlock.pending, (state) => { state.isSubmitting = true; state.error = null; })
      .addCase(finishBlock.fulfilled, (state, action) => {
        state.isSubmitting = false;
        applyFinish(state, action.payload);
      })
      .addCase(finishBlock.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload ?? 'Unknown error'; });

    builder.addCase(expireBlock.fulfilled, (state, action) => {
      state.isSubmitting = false;
      applyFinish(state, action.payload);
    });

    builder
      .addCase(fetchBlockReview.pending, (state) => { state.reviewLoading = true; })
      .addCase(fetchBlockReview.fulfilled, (state, action) => { state.reviewLoading = false; state.review = action.payload; })
      .addCase(fetchBlockReview.rejected, (state) => { state.reviewLoading = false; });
  },
});

export const { setActiveIndex, clearLinearFeedback, resetScramble } = scrambleSlice.actions;