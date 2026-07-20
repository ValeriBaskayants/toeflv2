import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { VocabularyApi } from '@/api/services/vocabulary';
import type {
  Flashcard,
  VocabCard,
  VocabularyWord,
  VocabUserProgress,
  ReviewResult,
  ReviewWordPayload,
  GetVocabularyParams,
  GetFlashcardsParams,
  SubmitVocabAnswerPayload,
  SubmitAnswerResult,
} from '@/types/vocabulary/Vocabulary';



export const fetchSession = createAsyncThunk<
  VocabCard[],
  GetFlashcardsParams | undefined,
  { rejectValue: string }
>('vocabulary/fetchSession', async (params, { rejectWithValue }) => {
  try {
    const { data } = await VocabularyApi.getSession(params);
    return data;
  } catch (error: unknown) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to load session');
  }
});

export const submitVocabAnswer = createAsyncThunk<
  SubmitAnswerResult & { wordId: string },
  SubmitVocabAnswerPayload,
  { rejectValue: string }
>('vocabulary/submitAnswer', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await VocabularyApi.submitAnswer(payload);
    return { ...data, wordId: payload.wordId };
  } catch (error: unknown) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to submit answer');
  }
});

export const fetchFlashcards = createAsyncThunk<
  Flashcard[],
  GetFlashcardsParams | undefined,
  { rejectValue: string }
>('vocabulary/fetchFlashcards', async (params, { rejectWithValue }) => {
  try {
    const { data } = await VocabularyApi.getFlashcards(params);
    return data;
  } catch (error: unknown) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to load flashcards');
  }
});

export const reviewWord = createAsyncThunk<
  ReviewResult & { wordId: string },
  ReviewWordPayload,
  { rejectValue: string }
>('vocabulary/reviewWord', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await VocabularyApi.reviewWord(payload);
    return { ...data, wordId: payload.wordId };
  } catch (error: unknown) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to submit review');
  }
});

export const fetchWordList = createAsyncThunk<
  VocabularyWord[],
  GetVocabularyParams | undefined,
  { rejectValue: string }
>('vocabulary/fetchWordList', async (params, { rejectWithValue }) => {
  try {
    const { data } = await VocabularyApi.getAll(params);
    return data;
  } catch (error: unknown) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to load vocabulary');
  }
});

export const fetchVocabProgress = createAsyncThunk<
  VocabUserProgress,
  void,
  { rejectValue: string }
>('vocabulary/fetchProgress', async (_, { rejectWithValue }) => {
  try {
    const { data } = await VocabularyApi.getUserProgress();
    return data;
  } catch (error: unknown) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to load progress');
  }
});



type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

interface VocabularyState {
  sessionCards: VocabCard[];
  sessionStatus: AsyncStatus;
  sessionError: string | null;

  submitAnswerStatus: AsyncStatus;
  submitAnswerError: string | null;

  flashcards: Flashcard[];
  flashcardsStatus: AsyncStatus;
  flashcardsError: string | null;

  wordList: VocabularyWord[];
  wordListStatus: AsyncStatus;
  wordListError: string | null;

  userProgress: VocabUserProgress | null;
  userProgressStatus: AsyncStatus;

  reviewStatus: AsyncStatus;
  reviewError: string | null;
}

const initialState: VocabularyState = {
  sessionCards: [],
  sessionStatus: 'idle',
  sessionError: null,

  submitAnswerStatus: 'idle',
  submitAnswerError: null,

  flashcards: [],
  flashcardsStatus: 'idle',
  flashcardsError: null,

  wordList: [],
  wordListStatus: 'idle',
  wordListError: null,

  userProgress: null,
  userProgressStatus: 'idle',

  reviewStatus: 'idle',
  reviewError: null,
};

const VocabularySlice = createSlice({
  name: 'vocabulary',
  initialState,
  reducers: {
    clearSession: (state) => {
      state.sessionCards = [];
      state.sessionStatus = 'idle';
      state.sessionError = null;
    },
    clearFlashcards: (state) => {
      state.flashcards = [];
      state.flashcardsStatus = 'idle';
      state.flashcardsError = null;
    },
    clearWordList: (state) => {
      state.wordList = [];
      state.wordListStatus = 'idle';
    },
    removeCardFromSession: (state, action: PayloadAction<string>) => {
      state.sessionCards = state.sessionCards.filter((c) => c.cardId !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      
      .addCase(fetchSession.pending, (state) => {
        state.sessionStatus = 'loading';
        state.sessionError = null;
      })
      .addCase(fetchSession.fulfilled, (state, action) => {
        state.sessionCards = action.payload;
        state.sessionStatus = 'success';
      })
      .addCase(fetchSession.rejected, (state, action) => {
        state.sessionStatus = 'error';
        state.sessionError = action.payload ?? 'Unknown error';
      })

      
      .addCase(submitVocabAnswer.pending, (state) => {
        state.submitAnswerStatus = 'loading';
        state.submitAnswerError = null;
      })
      .addCase(submitVocabAnswer.fulfilled, (state, action) => {
        state.submitAnswerStatus = 'success';
        if (action.payload.justMastered && state.userProgress !== null) {
          state.userProgress.mastered += 1;
          state.userProgress.dueToday = Math.max(0, state.userProgress.dueToday - 1);
        } else if (state.userProgress !== null && state.userProgress.dueToday > 0) {
          state.userProgress.dueToday -= 1;
        }
      })
      .addCase(submitVocabAnswer.rejected, (state, action) => {
        state.submitAnswerStatus = 'error';
        state.submitAnswerError = action.payload ?? 'Unknown error';
      })

      
      .addCase(fetchFlashcards.pending, (state) => {
        state.flashcardsStatus = 'loading';
      })
      .addCase(fetchFlashcards.fulfilled, (state, action) => {
        state.flashcards = action.payload;
        state.flashcardsStatus = 'success';
      })
      .addCase(fetchFlashcards.rejected, (state, action) => {
        state.flashcardsStatus = 'error';
        state.flashcardsError = action.payload ?? 'Unknown error';
      })

      
      .addCase(fetchWordList.pending, (state) => {
        state.wordListStatus = 'loading';
      })
      .addCase(fetchWordList.fulfilled, (state, action) => {
        state.wordList = action.payload;
        state.wordListStatus = 'success';
      })
      .addCase(fetchWordList.rejected, (state, action) => {
        state.wordListStatus = 'error';
        state.wordListError = action.payload ?? 'Unknown error';
      })

      
      .addCase(fetchVocabProgress.pending, (state) => {
        state.userProgressStatus = 'loading';
      })
      .addCase(fetchVocabProgress.fulfilled, (state, action) => {
        state.userProgress = action.payload;
        state.userProgressStatus = 'success';
      })
      .addCase(fetchVocabProgress.rejected, (state) => {
        state.userProgressStatus = 'error';
      });
  },
});

export const { clearSession, clearFlashcards, clearWordList, removeCardFromSession } =
  VocabularySlice.actions;

export const vocabularySlice = VocabularySlice;

interface VocabRootState {
  vocabulary: VocabularyState;
}



export const selectSessionCards = (s: VocabRootState): VocabCard[] => s.vocabulary.sessionCards;
export const selectSessionStatus = (s: VocabRootState): AsyncStatus => s.vocabulary.sessionStatus;
export const selectSessionError = (s: VocabRootState): string | null => s.vocabulary.sessionError;
export const selectSubmitAnswerStatus = (s: VocabRootState): AsyncStatus => s.vocabulary.submitAnswerStatus;
export const selectSubmitAnswerError = (s: VocabRootState): string | null => s.vocabulary.submitAnswerError;

export const selectFlashcards = (s: VocabRootState): Flashcard[] => s.vocabulary.flashcards;
export const selectFlashcardsStatus = (s: VocabRootState): AsyncStatus => s.vocabulary.flashcardsStatus;
export const selectFlashcardsError = (s: VocabRootState): string | null => s.vocabulary.flashcardsError;
export const selectWordList = (s: VocabRootState): VocabularyWord[] => s.vocabulary.wordList;
export const selectWordListStatus = (s: VocabRootState): AsyncStatus => s.vocabulary.wordListStatus;
export const selectVocabProgress = (s: VocabRootState): VocabUserProgress | null => s.vocabulary.userProgress;
export const selectReviewStatus = (s: VocabRootState): AsyncStatus => s.vocabulary.reviewStatus;
