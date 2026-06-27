import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { exercisesApi } from '@/api';
import type { Exercise, SubmitResult, GetExercisesParams } from '@/types/exercises/Exercise.types';
import type { Level, Difficulty } from '@/types/globalTypes';




interface ExercisesState {

  list:          Exercise[];
  listIsLoading: boolean;
  listError:     string | null;

  activeLevel:      Level | null;
  activeDifficulty: Difficulty | null;
  activeTopic:      string | null;

  
  topics:          string[];
  topicsIsLoading: boolean;

  
  activeExerciseId: string | null;
  answers:          Record<number, string>; 
  submitIsLoading:  boolean;
  submitError:      string | null;
  submitResult:     SubmitResult | null;
  isRevealed:       boolean; 
}

const initialState: ExercisesState = {
  list:          [],
  listIsLoading: false,
  listError:     null,

  activeLevel:      null,
  activeDifficulty: null,
  activeTopic:      null,

  topics:          [],
  topicsIsLoading: false,

  activeExerciseId: null,
  answers:          {},
  submitIsLoading:  false,
  submitError:      null,
  submitResult:     null,
  isRevealed:       false,
};



export const fetchExercises = createAsyncThunk<
  Exercise[],
  GetExercisesParams | undefined,
  { rejectValue: string }
>(
  'exercises/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      return await exercisesApi.getAll(params);
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to load exercises',
      );
    }
  },
);

export const fetchExerciseTopics = createAsyncThunk<
  string[],
  string | undefined,
  { rejectValue: string }
>(
  'exercises/fetchTopics',
  async (level, { rejectWithValue }) => {
    try {
      return await exercisesApi.getTopics(level);
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to load topics',
      );
    }
  },
);

export const submitExerciseAnswer = createAsyncThunk<
  SubmitResult,
  { exerciseId: string; answers: string[]; timezone?: string },
  { rejectValue: string }
>(
  'exercises/submit',
  async ({ exerciseId, answers, timezone }, { rejectWithValue }) => {
    try {
      return await exercisesApi.submit(exerciseId, answers, timezone);
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to submit answer',
      );
    }
  },
);



export const exercisesSlice = createSlice({
  name: 'exercises',
  initialState,
  reducers: {
    setActiveLevel: (state, action: PayloadAction<Level | null>) => {
      state.activeLevel = action.payload;
      state.activeTopic = null; 
    },
    setActiveDifficulty: (state, action: PayloadAction<Difficulty | null>) => {
      state.activeDifficulty = action.payload;
    },
    setActiveTopic: (state, action: PayloadAction<string | null>) => {
      state.activeTopic = action.payload;
    },
    openExercise: (state, action: PayloadAction<string>) => {
      state.activeExerciseId = action.payload;
      state.answers          = {};
      state.submitResult     = null;
      state.submitError      = null;
      state.isRevealed       = false;
    },
    closeExercise: (state) => {
      state.activeExerciseId = null;
      state.answers          = {};
      state.submitResult     = null;
      state.submitError      = null;
      state.isRevealed       = false;
    },
    setAnswer: (state, action: PayloadAction<{ position: number; value: string }>) => {
      state.answers[action.payload.position] = action.payload.value;
    },
    retryExercise: (state) => {
      state.answers      = {};
      state.submitResult = null;
      state.submitError  = null;
      state.isRevealed   = false;
    },
    nextExercise: (state) => {
      
      const idx = state.list.findIndex((e) => e.id === state.activeExerciseId);
      const next = state.list[(idx + 1) % state.list.length];
      if (next !== undefined) {
        state.activeExerciseId = next.id;
        state.answers          = {};
        state.submitResult     = null;
        state.submitError      = null;
        state.isRevealed       = false;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      
      .addCase(fetchExercises.pending, (state) => {
        state.listIsLoading = true;
        state.listError     = null;
      })
      .addCase(fetchExercises.fulfilled, (state, action) => {
        state.list          = action.payload;
        state.listIsLoading = false;
        
        if (state.activeExerciseId === null && action.payload.length > 0) {
          const first = action.payload[0];
          if (first !== undefined) {
            state.activeExerciseId = first.id;
          }
        }
      })
      .addCase(fetchExercises.rejected, (state, action) => {
        state.listIsLoading = false;
        state.listError     = action.payload ?? 'Unknown error';
      })

      
      .addCase(fetchExerciseTopics.pending, (state) => {
        state.topicsIsLoading = true;
      })
      .addCase(fetchExerciseTopics.fulfilled, (state, action) => {
        state.topics          = action.payload;
        state.topicsIsLoading = false;
      })
      .addCase(fetchExerciseTopics.rejected, (state) => {
        state.topicsIsLoading = false;
      })

      
      .addCase(submitExerciseAnswer.pending, (state) => {
        state.submitIsLoading = true;
        state.submitError     = null;
      })
      .addCase(submitExerciseAnswer.fulfilled, (state, action) => {
        state.submitResult    = action.payload;
        state.submitIsLoading = false;
        state.isRevealed      = true;
      })
      .addCase(submitExerciseAnswer.rejected, (state, action) => {
        state.submitIsLoading = false;
        state.submitError     = action.payload ?? 'Submit failed';
      });
  },
});



export const {
  setActiveLevel,
  setActiveDifficulty,
  setActiveTopic,
  openExercise,
  closeExercise,
  setAnswer,
  retryExercise,
  nextExercise,
} = exercisesSlice.actions;

export const exercisesReducer = exercisesSlice.reducer;



interface ExercisesRootState {
  exercises: ExercisesState;
}

export const selectExercisesList          = (s: ExercisesRootState) => s.exercises.list;
export const selectExercisesListIsLoading = (s: ExercisesRootState) => s.exercises.listIsLoading;
export const selectExercisesListError     = (s: ExercisesRootState) => s.exercises.listError;

export const selectActiveLevel            = (s: ExercisesRootState) => s.exercises.activeLevel;
export const selectActiveDifficulty       = (s: ExercisesRootState) => s.exercises.activeDifficulty;
export const selectActiveTopic            = (s: ExercisesRootState) => s.exercises.activeTopic;

export const selectTopics                 = (s: ExercisesRootState) => s.exercises.topics;
export const selectTopicsIsLoading        = (s: ExercisesRootState) => s.exercises.topicsIsLoading;

export const selectActiveExerciseId       = (s: ExercisesRootState) => s.exercises.activeExerciseId;
export const selectAnswers                = (s: ExercisesRootState) => s.exercises.answers;
export const selectSubmitIsLoading        = (s: ExercisesRootState) => s.exercises.submitIsLoading;
export const selectSubmitError            = (s: ExercisesRootState) => s.exercises.submitError;
export const selectSubmitResult           = (s: ExercisesRootState) => s.exercises.submitResult;
export const selectIsRevealed             = (s: ExercisesRootState) => s.exercises.isRevealed;

export const selectActiveExercise = (s: ExercisesRootState): Exercise | null =>
  s.exercises.list.find((e) => e.id === s.exercises.activeExerciseId) ?? null;


export const selectFilteredExercises = (s: ExercisesRootState): Exercise[] => {
  const { list, activeLevel, activeDifficulty, activeTopic } = s.exercises;
  return list.filter((ex) => {
    if (activeLevel !== null && ex.level !== activeLevel) { return false; }
    if (activeDifficulty !== null && ex.difficulty !== activeDifficulty) { return false; }
    if (activeTopic !== null && ex.topic !== activeTopic) { return false; }
    return true;
  });
};


export const selectAnswerProgress = (s: ExercisesRootState): { filled: number; total: number } => {
  const ex = selectActiveExercise(s);
  if (ex === null) { return { filled: 0, total: 0 }; }
  const filled = ex.blanks.filter((b) => {
    const ans = s.exercises.answers[b.position];
    return ans !== undefined && ans.trim().length > 0;
  }).length;
  return { filled, total: ex.blanks.length };
};