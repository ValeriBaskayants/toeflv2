import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { MultipleChoiceApi } from '@/api';
import { Level, Difficulty } from '@/types/globalTypes';
import type { 
  MultipleChoice, 
  SubmitMCResult, 
  SubmitMCSessionResponse 
} from '@/types/multipleChoice/MultipleChoice.types';

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';
export type QuizPhase = 'setup' | 'playing' | 'results';

export interface QuizSetup {
  level: Level;
  difficulty: Difficulty;
  count: number;
  topic: string;
}

interface QuizState {
  phase: QuizPhase;
  setup: QuizSetup;

  questions: MultipleChoice[]; 
  currentIdx: number;
  
  answers: Record<string, number>;

  loadStatus: AsyncStatus;
  loadError: string | null;

  submitStatus: AsyncStatus;
  submitError: string | null;

  results: SubmitMCResult[] | null;
  accuracy: number | null;
  xpEarned: number | null;
  correctCount: number | null;
  totalCount: number | null;
}

const DEFAULT_SETUP: QuizSetup = {
  level: Level.B1,
  difficulty: Difficulty.MEDIUM,
  count: 10,
  topic: '',
};

const initialState: QuizState = {
  phase: 'setup',
  setup: DEFAULT_SETUP,

  questions: [],
  currentIdx: 0,
  answers: {},

  loadStatus: 'idle',
  loadError: null,

  submitStatus: 'idle',
  submitError: null,

  results: null,
  accuracy: null,
  xpEarned: null,
  correctCount: null,
  totalCount: null,
};

export const loadQuizQuestions = createAsyncThunk<
  MultipleChoice[],
  QuizSetup,
  { rejectValue: string }
>('quiz/load', async (setup, { rejectWithValue }) => {
  try {
    const { data } = await MultipleChoiceApi.getList({
      level: setup.level,
      difficulty: setup.difficulty,
      limit: setup.count,
      ...(setup.topic !== '' && { topic: setup.topic }),
    });

    if (data.length === 0) {
      return rejectWithValue('No questions found for these filters. Try a different level or difficulty.');
    }

    return [...data].sort(() => Math.random() - 0.5).slice(0, setup.count);
  } catch (err: unknown) {
    return rejectWithValue(err instanceof Error ? err.message : 'Failed to load questions');
  }
});

export const submitQuiz = createAsyncThunk<
  SubmitMCSessionResponse, 
  { answers: Record<string, number>; level: Level; timezone?: string },
  { rejectValue: string }
>('quiz/submit', async ({ answers, level, timezone }, { rejectWithValue }) => {
  try {
    const payload = {
      answers: Object.entries(answers).map(([questionId, selectedIndex]) => ({
        questionId,
        selectedIndex,
      })),
    };
    const { data } = await MultipleChoiceApi.submit(payload, level, timezone);
    return data;
  } catch (err: unknown) {
    return rejectWithValue(err instanceof Error ? err.message : 'Failed to submit quiz');
  }
});

export const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    updateSetup: (state, action: PayloadAction<Partial<QuizSetup>>) => {
      state.setup = { ...state.setup, ...action.payload };
    },

    selectAnswer: (state, action: PayloadAction<{ questionId: string; index: number }>) => {
      state.answers[action.payload.questionId] = action.payload.index;
    },

    goToQuestion: (state, action: PayloadAction<number>) => {
      const idx = action.payload;
      if (idx >= 0 && idx < state.questions.length) {
        state.currentIdx = idx;
      }
    },

    nextQuestion: (state) => {
      if (state.currentIdx < state.questions.length - 1) {
        state.currentIdx += 1;
      }
    },

    prevQuestion: (state) => {
      if (state.currentIdx > 0) {
        state.currentIdx -= 1;
      }
    },

    exitQuiz: (state) => {
      state.phase        = 'setup';
      state.questions    = [];
      state.currentIdx   = 0;
      state.answers      = {};
      state.submitStatus = 'idle';
      state.submitError  = null;
      state.results      = null;
      state.accuracy     = null;
      state.xpEarned     = null;
      state.correctCount = null;
      state.totalCount   = null;
    },

    resetQuiz: () => initialState,
  },

  extraReducers: (builder) => {
    builder
      .addCase(loadQuizQuestions.pending, (state) => {
        state.loadStatus = 'loading';
        state.loadError  = null;
      })
      .addCase(loadQuizQuestions.fulfilled, (state, action) => {
        state.loadStatus  = 'success';
        state.questions   = action.payload;
        state.currentIdx  = 0;
        state.answers     = {};
        state.phase       = 'playing';
        state.results     = null;
        state.accuracy    = null;
        state.xpEarned    = null;
        state.correctCount = null;
        state.totalCount   = null;
      })
      .addCase(loadQuizQuestions.rejected, (state, action) => {
        state.loadStatus = 'error';
        state.loadError  = action.payload ?? 'Unknown error';
      });

    builder
      .addCase(submitQuiz.pending, (state) => {
        state.submitStatus = 'loading';
        state.submitError  = null;
      })
      .addCase(submitQuiz.fulfilled, (state, action) => {
        state.submitStatus = 'success';
        state.results      = action.payload.results;
        state.accuracy     = action.payload.accuracy;
        state.xpEarned     = action.payload.xpEarned;
        state.correctCount = action.payload.correctCount;
        state.totalCount   = action.payload.totalCount;
        state.phase        = 'results';
      })
      .addCase(submitQuiz.rejected, (state, action) => {
        state.submitStatus = 'error';
        state.submitError  = action.payload ?? 'Unknown error';
      });
  },
});

export const {
  updateSetup,
  selectAnswer,
  goToQuestion,
  nextQuestion,
  prevQuestion,
  exitQuiz,
  resetQuiz,
} = quizSlice.actions;