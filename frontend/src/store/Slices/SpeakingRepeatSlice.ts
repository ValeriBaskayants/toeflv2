import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { speakingRepeatApi } from '@/api/services/speaking-repeat';
import type {
  SpeakingRepeatSetSummary,
  SpeakingRepeatItem,
  SpeakingSessionReview,
} from '@/types/speaking/Speaking.types';
import type { Level } from '@/types/globalTypes';

interface SpeakingRepeatState {
  sets: SpeakingRepeatSetSummary[];
  setsLoading: boolean;
  setsError: string | null;

  sessionId: string | null;
  scenario: string | null;
  voiceId: string | null;
  items: SpeakingRepeatItem[];
  currentIndex: number;

  submitting: boolean;
  submitError: string | null;

  finishing: boolean;
  review: SpeakingSessionReview | null;
}

const initialState: SpeakingRepeatState = {
  sets: [],
  setsLoading: false,
  setsError: null,

  sessionId: null,
  scenario: null,
  voiceId: null,
  items: [],
  currentIndex: 0,

  submitting: false,
  submitError: null,

  finishing: false,
  review: null,
};

interface SpeakingRepeatRootState {
  speakingRepeat: SpeakingRepeatState;
}

export const fetchSpeakingSets = createAsyncThunk<SpeakingRepeatSetSummary[], Level, { rejectValue: string }>(
  'speakingRepeat/fetchSets',
  async (level, { rejectWithValue }) => {
    try {
      return await speakingRepeatApi.getSets(level);
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load speaking sets');
    }
  },
);

interface StartSessionResult {
  sessionId: string;
  items: SpeakingRepeatItem[];
  voiceId: string;
  scenario: string;
}

// ИСПРАВЛЕНО: добавлена скобка < после createAsyncThunk
export const startSpeakingSession = createAsyncThunk<
  StartSessionResult,
  { setId: string; scenario: string },
  { rejectValue: string }
>('speakingRepeat/startSession', async ({ setId, scenario }, { rejectWithValue }) => {
  try {
    const data = await speakingRepeatApi.startSession(setId);
    return { sessionId: data.session.id, items: data.items, voiceId: data.voiceId, scenario };
  } catch (error: unknown) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to start session');
  }
});

interface SubmitRejectValue {
  status: number;
  message: string;
}

// ИСПРАВЛЕНО: добавлена скобка < после createAsyncThunk
export const submitSpeakingAttempt = createAsyncThunk<
  void,
  { itemId: string; audioBlob: Blob },
  { state: SpeakingRepeatRootState; rejectValue: SubmitRejectValue }
>('speakingRepeat/submitAttempt', async ({ itemId, audioBlob }, { getState, rejectWithValue }) => {
  const sessionId = getState().speakingRepeat.sessionId;

  if (sessionId === null) {
    return rejectWithValue({ status: 0, message: 'No active session' });
  }

  try {
    await speakingRepeatApi.submitAttempt(sessionId, itemId, audioBlob);
    return undefined;
  } catch (error: unknown) {
    const status = axios.isAxiosError(error) ? error.response?.status ?? 0 : 0;
    const message = error instanceof Error ? error.message : 'Failed to submit attempt';
    return rejectWithValue({ status, message });
  }
});

// ИСПРАВЛЕНО: добавлена скобка < после createAsyncThunk
export const finishSpeakingSession = createAsyncThunk<
  SpeakingSessionReview,
  void,
  { state: SpeakingRepeatRootState; rejectValue: string }
>('speakingRepeat/finish', async (_, { getState, rejectWithValue }) => {
  const sessionId = getState().speakingRepeat.sessionId;

  if (sessionId === null) {
    return rejectWithValue('No active session');
  }

  try {
    await speakingRepeatApi.completeSession(sessionId);
    return await speakingRepeatApi.getSessionReview(sessionId);
  } catch (error: unknown) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to finish session');
  }
});

export const speakingRepeatSlice = createSlice({
  name: 'speakingRepeat',
  initialState,
  reducers: {
    advanceSpeakingItem: (state) => {
      state.currentIndex += 1;
    },
    resetSpeakingSession: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpeakingSets.pending, (state) => {
        state.setsLoading = true;
        state.setsError = null;
      })
      .addCase(fetchSpeakingSets.fulfilled, (state, action) => {
        state.setsLoading = false;
        state.sets = action.payload;
      })
      .addCase(fetchSpeakingSets.rejected, (state, action) => {
        state.setsLoading = false;
        state.setsError = action.payload ?? 'Unknown error';
      });

    builder
      .addCase(startSpeakingSession.fulfilled, (state, action) => {
        state.sessionId = action.payload.sessionId;
        state.items = action.payload.items;
        state.voiceId = action.payload.voiceId;
        state.scenario = action.payload.scenario;
        state.currentIndex = 0;
        state.review = null;
      });

    builder
      .addCase(submitSpeakingAttempt.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(submitSpeakingAttempt.fulfilled, (state) => {
        state.submitting = false;
      })
      .addCase(submitSpeakingAttempt.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload?.message ?? 'Submit failed';
      });

    builder
      .addCase(finishSpeakingSession.pending, (state) => {
        state.finishing = true;
      })
      .addCase(finishSpeakingSession.fulfilled, (state, action) => {
        state.finishing = false;
        state.review = action.payload;
      })
      .addCase(finishSpeakingSession.rejected, (state) => {
        state.finishing = false;
      });
  },
});

export const { advanceSpeakingItem, resetSpeakingSession } = speakingRepeatSlice.actions;

export const speakingRepeatReducer = speakingRepeatSlice.reducer;

export const selectSpeakingSets = (s: SpeakingRepeatRootState) => s.speakingRepeat.sets;
export const selectSpeakingSetsLoading = (s: SpeakingRepeatRootState) => s.speakingRepeat.setsLoading;
export const selectSpeakingSetsError = (s: SpeakingRepeatRootState) => s.speakingRepeat.setsError;