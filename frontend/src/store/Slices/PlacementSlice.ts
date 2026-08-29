import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { placementApi } from '@/api/index';
import type {
  PlacementStatus,
  PublicQuestion,
  DimensionResult,
} from '@/types/placement/Placement.types';





export interface PlacementState {
  
  status:          PlacementStatus | null;
  showBanner:      boolean;
  detectedLevel:   string | null;
  confidenceScore: number | null;
  statusLoaded:    boolean;
  attemptCount:    number;

  
  canRetake:       boolean;        
  lastCompletedAt: string | null;  

  
  currentQuestion:   PublicQuestion | null;
  questionsAnswered: number;
  maxQuestions:      number;
  progressHint:      string | null;  

  
  lastAnswerCorrect: boolean | null;

  
  questionShownAt: string | null;

  
  dimensionBreakdown: DimensionResult[];  
  testDurationSeconds: number | null;
  isRetake:            boolean;

  
  isLoadingStatus: boolean;
  isStarting:      boolean;
  isAnswering:     boolean;
  isSkipping:      boolean;
  isReminding:     boolean;

  error: string | null;
}

const initialState: PlacementState = {
  status:          null,
  showBanner:      false,
  detectedLevel:   null,
  confidenceScore: null,
  statusLoaded:    false,
  attemptCount:    0,
  canRetake:       false,
  lastCompletedAt: null,

  currentQuestion:   null,
  questionsAnswered: 0,
  maxQuestions:      30,
  progressHint:      null,

  lastAnswerCorrect: null,
  questionShownAt:   null,

  dimensionBreakdown:  [],
  testDurationSeconds: null,
  isRetake:            false,

  isLoadingStatus: false,
  isStarting:      false,
  isAnswering:     false,
  isSkipping:      false,
  isReminding:     false,

  error: null,
};





export const fetchPlacementStatus = createAsyncThunk(
  'placement/fetchStatus',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await placementApi.getStatus();
      return data;
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch placement status',
      );
    }
  },
);

export const startPlacementTest = createAsyncThunk(
  'placement/start',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await placementApi.start();
      return data;
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to start placement test',
      );
    }
  },
);

export const answerPlacementQuestion = createAsyncThunk(
  'placement/answer',
  async (
    {
      questionIndex,
      selectedIndex,
      questionStartAt,
    }: {
      questionIndex:   number;
      selectedIndex:   number;
      questionStartAt?: string;  
    },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await placementApi.answer(questionIndex, selectedIndex, questionStartAt);
      return data;
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to submit answer',
      );
    }
  },
);

export const skipPlacementTest = createAsyncThunk(
  'placement/skip',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await placementApi.skip();
      return data;
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to skip placement test',
      );
    }
  },
);

export const remindLaterPlacement = createAsyncThunk(
  'placement/remindLater',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await placementApi.remindLater();
      return data;
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to set reminder',
      );
    }
  },
);





export const placementSlice = createSlice({
  name: 'placement',
  initialState,
  reducers: {
    clearLastAnswerFeedback: (state) => {
      state.lastAnswerCorrect = null;
    },
    dismissBannerLocally: (state) => {
      state.showBanner = false;
    },
    clearPlacementError: (state) => {
      state.error = null;
    },
    
    recordQuestionShownAt: (state, action: PayloadAction<string>) => {
      state.questionShownAt = action.payload;
    },
  },
  extraReducers: (builder) => {
    
    builder
      .addCase(fetchPlacementStatus.pending, (state) => {
        state.isLoadingStatus = true;
        state.error = null;
      })
      .addCase(fetchPlacementStatus.fulfilled, (state, action) => {
        state.isLoadingStatus = false;
        state.statusLoaded    = true;
        state.status          = action.payload.status;
        state.showBanner      = action.payload.showBanner;
        state.detectedLevel   = action.payload.detectedLevel;
        state.confidenceScore = action.payload.confidenceScore;
        state.attemptCount    = action.payload.attemptCount;
        
        state.canRetake       = action.payload.canRetake;
        state.lastCompletedAt = action.payload.lastCompletedAt;
      })
      .addCase(fetchPlacementStatus.rejected, (state, action) => {
        state.isLoadingStatus = false;
        state.statusLoaded    = true;
        state.error           = action.payload as string;
      });

    
    builder
      .addCase(startPlacementTest.pending, (state) => {
        state.isStarting       = true;
        state.error            = null;
        state.currentQuestion  = null;
        state.questionsAnswered = 0;
        state.lastAnswerCorrect = null;
        state.dimensionBreakdown = [];
        state.testDurationSeconds = null;
        state.progressHint     = null;
        state.questionShownAt  = new Date().toISOString();
      })
      .addCase(startPlacementTest.fulfilled, (state, action) => {
        state.isStarting      = false;
        state.status          = 'IN_PROGRESS';
        state.showBanner      = false;
        state.currentQuestion = action.payload.nextQuestion;
        state.maxQuestions    = action.payload.maxQuestions;
        state.questionsAnswered = 0;
        
        state.questionShownAt = new Date().toISOString();
      })
      .addCase(startPlacementTest.rejected, (state, action) => {
        state.isStarting = false;
        state.error      = action.payload as string;
      });

    
    builder
      .addCase(answerPlacementQuestion.pending, (state) => {
        state.isAnswering = true;
        state.error       = null;
      })
      .addCase(answerPlacementQuestion.fulfilled, (state, action) => {
        state.isAnswering = false;
        const payload     = action.payload;

        if (payload.converged) {
          
          state.status              = 'COMPLETED';
          state.detectedLevel       = payload.detectedLevel;
          state.confidenceScore     = payload.confidenceScore;
          state.questionsAnswered   = payload.questionsAnswered;
          state.currentQuestion     = null;
          state.showBanner          = false;
          state.progressHint        = null;
          
          state.dimensionBreakdown  = payload.dimensionBreakdown;
          state.testDurationSeconds = payload.testDurationSeconds;
          state.isRetake            = payload.isRetake;
        } else {
          
          state.lastAnswerCorrect   = payload.isCorrect;
          state.questionsAnswered   = payload.questionsAnswered;
          state.currentQuestion     = payload.nextQuestion;
          state.progressHint        = payload.progressHint;
          
          state.questionShownAt     = new Date().toISOString();
        }
      })
      .addCase(answerPlacementQuestion.rejected, (state, action) => {
        state.isAnswering = false;
        state.error       = action.payload as string;
      });

    
    builder
      .addCase(skipPlacementTest.pending, (state) => {
        state.isSkipping = true;
        state.error      = null;
      })
      .addCase(skipPlacementTest.fulfilled, (state) => {
        state.isSkipping    = false;
        state.status        = 'SKIPPED';
        state.showBanner    = false;
        state.detectedLevel = 'A1';
      })
      .addCase(skipPlacementTest.rejected, (state, action) => {
        state.isSkipping = false;
        state.error      = action.payload as string;
      });

    
    builder
      .addCase(remindLaterPlacement.pending, (state) => {
        state.isReminding = true;
        state.error       = null;
      })
      .addCase(remindLaterPlacement.fulfilled, (state) => {
        state.isReminding = false;
        state.status      = 'REMIND_LATER';
        state.showBanner  = false;
      })
      .addCase(remindLaterPlacement.rejected, (state, action) => {
        state.isReminding = false;
        state.error       = action.payload as string;
      });
  },
});

export const {
  clearLastAnswerFeedback,
  dismissBannerLocally,
  clearPlacementError,
  recordQuestionShownAt,
} = placementSlice.actions;