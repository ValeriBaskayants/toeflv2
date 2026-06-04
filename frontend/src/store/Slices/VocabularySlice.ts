import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { VocabularyApi } from '@/api/services/vocabulary';
import type {
  Flashcard,
  VocabularyWord,
  VocabUserProgress,
  ReviewResult,
  ReviewWordPayload,
  GetVocabularyParams,
  GetFlashcardsParams,
} from '@/types/vocabulary/Vocabulary';

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

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

interface VocabularyState {
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
    clearFlashcards: (state) => {
      state.flashcards = [];
      state.flashcardsStatus = 'idle';
      state.flashcardsError = null;
    },
    clearWordList: (state) => {
      state.wordList = [];
      state.wordListStatus = 'idle';
    },

    updateFlashcardStatus: (state, action: PayloadAction<{ wordId: string; status: string }>) => {
      const card = state.flashcards.find((f) => f.word.id === action.payload.wordId);
      if (card?.progress !== null && card !== undefined) {
        card.progress = {
          ...card.progress!,
          status: action.payload.status as never,
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder

      .addCase(fetchFlashcards.pending, (state) => {
        state.flashcardsStatus = 'loading';
        state.flashcardsError = null;
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
        state.wordListError = null;
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
      })

      .addCase(reviewWord.pending, (state) => {
        state.reviewStatus = 'loading';
        state.reviewError = null;
      })
      .addCase(reviewWord.fulfilled, (state, action) => {
        state.reviewStatus = 'success';

        const card = state.flashcards.find((f) => f.word.id === action.payload.wordId);
        if (card !== undefined) {
          if (card.progress === null) {
            card.progress = {
              id: '',
              userId: '',
              wordId: action.payload.wordId,
              easinessFactor: 2.5,
              interval: action.payload.interval,
              repetitions: action.payload.repetitions,
              nextReviewDate: action.payload.nextReviewDate,
              status: action.payload.status,
              lastReviewedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          } else {
            card.progress.status = action.payload.status;
            card.progress.interval = action.payload.interval;
            card.progress.repetitions = action.payload.repetitions;
            card.progress.nextReviewDate = action.payload.nextReviewDate;
          }
        }

        if (action.payload.justMastered && state.userProgress !== null) {
          state.userProgress.mastered += 1;
          state.userProgress.learned += 1;
        }
      })
      .addCase(reviewWord.rejected, (state, action) => {
        state.reviewStatus = 'error';
        state.reviewError = action.payload ?? 'Unknown error';
      });
  },
});

export const { clearFlashcards, clearWordList, updateFlashcardStatus } = VocabularySlice.actions;

export const vocabularySlice = VocabularySlice;

interface VocabRootState {
  vocabulary: VocabularyState;
}

export const selectFlashcards = (s: VocabRootState): Flashcard[] => s.vocabulary.flashcards;

export const selectFlashcardsStatus = (s: VocabRootState): AsyncStatus =>
  s.vocabulary.flashcardsStatus;

export const selectFlashcardsError = (s: VocabRootState): string | null =>
  s.vocabulary.flashcardsError;

export const selectWordList = (s: VocabRootState): VocabularyWord[] => s.vocabulary.wordList;

export const selectWordListStatus = (s: VocabRootState): AsyncStatus => s.vocabulary.wordListStatus;

export const selectWordListError = (s: VocabRootState): string | null => s.vocabulary.wordListError;

export const selectVocabProgress = (s: VocabRootState): VocabUserProgress | null =>
  s.vocabulary.userProgress;

export const selectReviewStatus = (s: VocabRootState): AsyncStatus => s.vocabulary.reviewStatus;
