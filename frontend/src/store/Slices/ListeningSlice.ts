import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { listeningApi } from '@/api/services/listening';
import { LIST_CACHE_TTL_MS, getTaskByType } from '@/constants/listening';
import { registerAudio, releaseAllAudio } from '@/utils/listeningAudio';
import type { ListeningMode, ListeningType } from '@/types/globalTypes';
import type {
  ListeningAudioMeta,
  ListeningCompleteResult,
  ListeningMaterialSummary,
  ListeningNote,
  ListeningSessionStart,
  StudyFeedback,
} from '@/types/listening/Listening.types';

interface TypeList {
  items: ListeningMaterialSummary[];
  fetchedAt: number;
}

type AudioStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AudioState {
  sessionId: string | null;
  status: AudioStatus;
  error: string | null;
  meta: ListeningAudioMeta | null;
}

export interface AnswerEntry {
  selectedIndex: number;
  feedback: StudyFeedback | null; 
}

interface ListeningState {
  lists: Partial<Record<ListeningType, TypeList>>;
  listLoading: Partial<Record<ListeningType, boolean>>;
  listError: Partial<Record<ListeningType, string | null>>;

  session: ListeningSessionStart | null;
  starting: boolean;
  startError: string | null;

  audio: AudioState;
  answers: Record<string, AnswerEntry>;
  submitting: boolean;
  submitError: string | null;

  finishing: boolean;
  finishError: string | null;
  result: ListeningCompleteResult | null;
}

const emptyAudio: AudioState = { sessionId: null, status: 'idle', error: null, meta: null };

const initialState: ListeningState = {
  lists: {},
  listLoading: {},
  listError: {},
  session: null,
  starting: false,
  startError: null,
  audio: emptyAudio,
  answers: {},
  submitting: false,
  submitError: null,
  finishing: false,
  finishError: null,
  result: null,
};

interface Cfg {
  state: { listening: ListeningState };
  rejectValue: string;
}
interface Rej {
  rejectValue: string;
}

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

export const fetchTypeList = createAsyncThunk<
  { type: ListeningType; items: ListeningMaterialSummary[] },
  { type: ListeningType; force?: boolean },
  Cfg
>(
  'listening/fetchTypeList',
  async ({ type }, { rejectWithValue }) => {
    try {
      const { data } = await listeningApi.list(type);
      return { type, items: data };
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to load materials'));
    }
  },
  {
    
    condition: ({ type, force }, { getState }) => {
      const s = getState().listening;
      if (s.listLoading[type] === true) return false;
      const cached = s.lists[type];
      return force === true || cached === undefined || Date.now() - cached.fetchedAt >= LIST_CACHE_TTL_MS;
    },
  },
);

export const startListeningSession = createAsyncThunk<
  ListeningSessionStart,
  { materialId: string; mode: ListeningMode },
  Rej
>('listening/startSession', async ({ materialId, mode }, { rejectWithValue }) => {
  try {
    releaseAllAudio();
    const { data } = await listeningApi.startSession(materialId, mode);
    return data;
  } catch (e: unknown) {
    return rejectWithValue(errMsg(e, 'Failed to start the task'));
  }
});

export const startToeflListening = createAsyncThunk<ListeningSessionStart, ListeningType, Rej>(
  'listening/startToefl',
  async (type, { rejectWithValue }) => {
    try {
      releaseAllAudio();
      const { data } = await listeningApi.startToefl(getTaskByType(type).toeflEndpoint);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to start the TOEFL task'));
    }
  },
);

export const fetchSessionAudio = createAsyncThunk<ListeningAudioMeta, string, Cfg>(
  'listening/fetchAudio',
  async (sessionId, { rejectWithValue }) => {
    try {
      const { data } = await listeningApi.getAudio(sessionId);
      await registerAudio(sessionId, data.audioBase64);
      return { playCount: data.playCount, maxAllowedPlays: data.maxAllowedPlays, cached: data.cached };
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to load the audio'));
    }
  },
  {
    
    condition: (sessionId, { getState }) => {
      const a = getState().listening.audio;
      return a.sessionId === sessionId && a.status === 'idle';
    },
  },
);

export const submitListeningAnswer = createAsyncThunk<
  { questionId: string; selectedIndex: number; feedback: StudyFeedback | null },
  { questionId: string; selectedIndex: number },
  Cfg
>('listening/submitAnswer', async ({ questionId, selectedIndex }, { getState, rejectWithValue }) => {
  const sessionId = getState().listening.session?.id;
  if (sessionId === undefined) return rejectWithValue('No active session');
  try {
    const { data } = await listeningApi.submitAnswer(sessionId, { questionId, selectedIndex });
    const feedback: StudyFeedback | null = 'isCorrect' in data
      ? { isCorrect: data.isCorrect, correctIndex: data.correctIndex, explanation: data.explanation }
      : null;
    return { questionId, selectedIndex, feedback };
  } catch (e: unknown) {
    return rejectWithValue(errMsg(e, 'Failed to submit the answer'));
  }
});

export const completeListening = createAsyncThunk<ListeningCompleteResult, void, Cfg>(
  'listening/complete',
  async (_, { getState, rejectWithValue }) => {
    const sessionId = getState().listening.session?.id;
    if (sessionId === undefined) return rejectWithValue('No active session');
    try {
      const { data } = await listeningApi.complete(sessionId);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to finish the task'));
    }
  },
);

export const expireListening = createAsyncThunk<ListeningCompleteResult, void, Cfg>(
  'listening/expire',
  async (_, { getState, rejectWithValue }) => {
    const sessionId = getState().listening.session?.id;
    if (sessionId === undefined) return rejectWithValue('No active session');
    try {
      const { data } = await listeningApi.expire(sessionId);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to finish the task'));
    }
  },
);


export const saveListeningNotes = createAsyncThunk<void, ListeningNote[], Cfg>(
  'listening/saveNotes',
  async (notes, { getState, rejectWithValue }) => {
    const sessionId = getState().listening.session?.id;
    if (sessionId === undefined) return rejectWithValue('No active session');
    try {
      await listeningApi.saveNotes(sessionId, notes);
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to save notes'));
    }
  },
);

export const leaveListeningSession = createAsyncThunk<void, void>('listening/leave', async () => {
  releaseAllAudio();
});

function applyStart(state: ListeningState, session: ListeningSessionStart): void {
  state.starting = false;
  state.startError = null;
  state.session = session;
  state.audio = { sessionId: session.id, status: 'idle', error: null, meta: null };
  state.answers = {};
  state.submitting = false;
  state.submitError = null;
  state.finishing = false;
  state.finishError = null;
  state.result = null;
}

function applyResult(state: ListeningState, result: ListeningCompleteResult): void {
  state.finishing = false;
  state.result = result;
  
  for (const list of Object.values(state.lists)) {
    if (list !== undefined) list.fetchedAt = 0;
  }
}

export const listeningSlice = createSlice({
  name: 'listening',
  initialState,
  reducers: {
    retryAudio: (state) => {
      if (state.audio.sessionId !== null) state.audio = { ...emptyAudio, sessionId: state.audio.sessionId };
    },
    clearStartError: (state: ListeningState, _action: PayloadAction<void>) => {
      state.startError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTypeList.pending, (state, action) => {
        const { type } = action.meta.arg;
        state.listLoading[type] = true;
        state.listError[type] = null;
      })
      .addCase(fetchTypeList.fulfilled, (state, action) => {
        const { type, items } = action.payload;
        state.listLoading[type] = false;
        state.lists[type] = { items, fetchedAt: Date.now() };
      })
      .addCase(fetchTypeList.rejected, (state, action) => {
        const { type } = action.meta.arg;
        state.listLoading[type] = false;
        state.listError[type] = action.payload ?? 'Unknown error';
      });

    builder
      .addCase(startListeningSession.pending, (state) => {
        state.starting = true;
        state.startError = null;
      })
      .addCase(startListeningSession.fulfilled, (state, action) => applyStart(state, action.payload))
      .addCase(startListeningSession.rejected, (state, action) => {
        state.starting = false;
        state.startError = action.payload ?? 'Unknown error';
      });

    builder
      .addCase(startToeflListening.pending, (state) => {
        state.starting = true;
        state.startError = null;
      })
      .addCase(startToeflListening.fulfilled, (state, action) => applyStart(state, action.payload))
      .addCase(startToeflListening.rejected, (state, action) => {
        state.starting = false;
        state.startError = action.payload ?? 'Unknown error';
      });

    builder
      .addCase(fetchSessionAudio.pending, (state, action) => {
        if (state.audio.sessionId === action.meta.arg) {
          state.audio.status = 'loading';
          state.audio.error = null;
        }
      })
      .addCase(fetchSessionAudio.fulfilled, (state, action) => {
        if (state.audio.sessionId === action.meta.arg) {
          state.audio.status = 'ready';
          state.audio.meta = action.payload;
        }
      })
      .addCase(fetchSessionAudio.rejected, (state, action) => {
        if (state.audio.sessionId === action.meta.arg) {
          state.audio.status = 'error';
          state.audio.error = action.payload ?? 'Unknown error';
        }
      });

    builder
      .addCase(submitListeningAnswer.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(submitListeningAnswer.fulfilled, (state, action) => {
        state.submitting = false;
        const { questionId, selectedIndex, feedback } = action.payload;
        state.answers[questionId] = { selectedIndex, feedback };
      })
      .addCase(submitListeningAnswer.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload ?? 'Unknown error';
      });

    for (const thunk of [completeListening, expireListening]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.finishing = true;
          state.finishError = null;
        })
        .addCase(thunk.fulfilled, (state, action) => applyResult(state, action.payload))
        .addCase(thunk.rejected, (state, action) => {
          state.finishing = false;
          state.finishError = action.payload ?? 'Unknown error';
        });
    }

    builder.addCase(leaveListeningSession.fulfilled, (state) => {
      state.session = null;
      state.audio = emptyAudio;
      state.answers = {};
      state.submitting = false;
      state.submitError = null;
      state.finishing = false;
      state.finishError = null;
      state.result = null;
      state.starting = false;
      state.startError = null;
    });
  },
});

export const { retryAudio, clearStartError } = listeningSlice.actions;