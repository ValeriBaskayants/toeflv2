import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { speakingRepeatApi } from '@/api/services/speaking-repeat';
import type {
  SpeakingSetListItem,
  SpeakingSetDetail,
  StartSpeakingSessionResponse,
  SpeakingSessionReview,
  GetSpeakingSetsParams,
} from '@/types/speaking/Speaking.types';

interface SpeakingRepeatState {
  sessionId: any;
  scenario: any;
  sets: SpeakingSetListItem[];
  setsLoading: boolean;
  setsError: string | null;

  currentSet: SpeakingSetDetail | null;
  setLoading: boolean;
  setError: string | null;

  activeSession: StartSpeakingSessionResponse | null;
  sessionLoading: boolean;
  sessionError: string | null;

  completing: boolean;
  completeError: string | null;

  reviewSession: SpeakingSessionReview | null;
  reviewLoading: boolean;
  reviewError: string | null;

  filters: { level: string | null; scenario: string };
}

const initialState: SpeakingRepeatState = {
  sets: [],
  setsLoading: false,
  setsError: null,

  currentSet: null,
  setLoading: false,
  setError: null,

  activeSession: null,
  sessionLoading: false,
  sessionError: null,

  completing: false,
  completeError: null,

  reviewSession: null,
  reviewLoading: false,
  reviewError: null,

  filters: { level: null, scenario: '' },
};

export const fetchSpeakingSets = createAsyncThunk<
  SpeakingSetListItem[],
  GetSpeakingSetsParams | undefined,
  { rejectValue: string }
>('speakingRepeat/fetchSets', async (params, { rejectWithValue }) => {
  try {
    const { data } = await speakingRepeatApi.getAll(params);
    return data;
  } catch (e: unknown) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to load');
  }
});

export const fetchSpeakingSetById = createAsyncThunk<SpeakingSetDetail, string, { rejectValue: string }>(
  'speakingRepeat/fetchSetById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await speakingRepeatApi.getSetById(id);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to load');
    }
  },
);

export const startSpeakingSession = createAsyncThunk<
  StartSpeakingSessionResponse,
  string,
  { rejectValue: string }
>('speakingRepeat/startSession', async (setId, { rejectWithValue }) => {
  try {
    const { data } = await speakingRepeatApi.startSession(setId);
    return data;
  } catch (e: unknown) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to start session');
  }
});

export const completeSpeakingSession = createAsyncThunk<
  SpeakingSessionReview,
  string,
  { rejectValue: string }
>('speakingRepeat/completeSession', async (sessionId, { rejectWithValue }) => {
  try {
    const { data } = await speakingRepeatApi.completeSession(sessionId);
    return data;
  } catch (e: unknown) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to complete session');
  }
});

export const fetchSpeakingReview = createAsyncThunk<
  SpeakingSessionReview,
  string,
  { rejectValue: string }
>('speakingRepeat/fetchReview', async (sessionId, { rejectWithValue }) => {
  try {
    const { data } = await speakingRepeatApi.getReview(sessionId);
    return data;
  } catch (e: unknown) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to load review');
  }
});

export const speakingRepeatSlice = createSlice({
  name: 'speakingRepeat',
  initialState,
  reducers: {
    setSpeakingFilter: (
      state,
      action: PayloadAction<{ key: 'level' | 'scenario'; value: string | null }>,
    ) => {
      if (action.payload.key === 'scenario') {
        state.filters.scenario = action.payload.value ?? '';
      } else {
        state.filters.level = action.payload.value;
      }
    },
    clearSpeakingPlayerState: (state) => {
      state.currentSet = null;
      state.activeSession = null;
      state.reviewSession = null;
      state.sessionError = null;
      state.completeError = null;
      state.reviewError = null;
    },
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
      .addCase(fetchSpeakingSetById.pending, (state) => {
        state.setLoading = true;
        state.setError = null;
        state.currentSet = null;
      })
      .addCase(fetchSpeakingSetById.fulfilled, (state, action) => {
        state.setLoading = false;
        state.currentSet = action.payload;
      })
      .addCase(fetchSpeakingSetById.rejected, (state, action) => {
        state.setLoading = false;
        state.setError = action.payload ?? 'Unknown error';
      });

    builder
      .addCase(startSpeakingSession.pending, (state) => {
        state.sessionLoading = true;
        state.sessionError = null;
        state.reviewSession = null;
      })
      .addCase(startSpeakingSession.fulfilled, (state, action) => {
        state.sessionLoading = false;
        state.activeSession = action.payload;
      })
      .addCase(startSpeakingSession.rejected, (state, action) => {
        state.sessionLoading = false;
        state.sessionError = action.payload ?? 'Unknown error';
      });

    builder
      .addCase(completeSpeakingSession.pending, (state) => {
        state.completing = true;
        state.completeError = null;
      })
      .addCase(completeSpeakingSession.fulfilled, (state, action) => {
        state.completing = false;
        state.reviewSession = action.payload;
      })
      .addCase(completeSpeakingSession.rejected, (state, action) => {
        state.completing = false;
        state.completeError = action.payload ?? 'Unknown error';
      });

    builder
      .addCase(fetchSpeakingReview.pending, (state) => {
        state.reviewLoading = true;
        state.reviewError = null;
      })
      .addCase(fetchSpeakingReview.fulfilled, (state, action) => {
        state.reviewLoading = false;
        state.reviewSession = action.payload;
      })
      .addCase(fetchSpeakingReview.rejected, (state, action) => {
        state.reviewLoading = false;
        state.reviewError = action.payload ?? 'Unknown error';
      });
  },
});

export const { setSpeakingFilter, clearSpeakingPlayerState } = speakingRepeatSlice.actions;