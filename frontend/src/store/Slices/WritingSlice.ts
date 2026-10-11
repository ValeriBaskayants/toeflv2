import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { writingApi, type GetPromptsParams } from '@/api/services/writing';
import type {
  WritingPromptWithStatus,
  WritingSubmission,
  StartSessionResponse,
} from '@/types/writing/Writing.types';
import { WritingType } from '@/types/globalTypes';

type ScoredWritingTypeParam = WritingType.EMAIL | WritingType.ACADEMIC_DISCUSSION;

interface WritingState {
  prompts: WritingPromptWithStatus[];
  promptsLoading: boolean;
  promptsError: string | null;
  levelFilter: string | null;

  session: StartSessionResponse | null;
  sessionStarting: boolean;
  sessionError: string | null;

  draftText: string;
  submitting: boolean;
  submitError: string | null;

  pendingSubmissionId: string | null;
  willCountForProgress: boolean | null;
  attemptNumber: number | null;

  currentSubmission: WritingSubmission | null;
  submissionLoading: boolean;
  submissionError: string | null;

  submissions: WritingSubmission[];
  submissionsLoading: boolean;
}

const initialState: WritingState = {
  prompts: [],
  promptsLoading: false,
  promptsError: null,
  levelFilter: null,

  session: null,
  sessionStarting: false,
  sessionError: null,

  draftText: '',
  submitting: false,
  submitError: null,

  pendingSubmissionId: null,
  willCountForProgress: null,
  attemptNumber: null,

  currentSubmission: null,
  submissionLoading: false,
  submissionError: null,

  submissions: [],
  submissionsLoading: false,
};

interface RejectValue { rejectValue: string }

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

export const fetchPrompts = createAsyncThunk<WritingPromptWithStatus[], GetPromptsParams | undefined, RejectValue>(
  'writing/fetchPrompts',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await writingApi.getPrompts(params);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to load prompts'));
    }
  },
);

export const startSession = createAsyncThunk<StartSessionResponse, string, RejectValue>(
  'writing/startSession',
  async (promptId, { rejectWithValue }) => {
    try {
      const { data } = await writingApi.startSession(promptId);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to start the session'));
    }
  },
);

export const startToeflSession = createAsyncThunk<StartSessionResponse, ScoredWritingTypeParam, RejectValue>(
  'writing/startToeflSession',
  async (type, { rejectWithValue }) => {
    try {
      const { data } = type === WritingType.EMAIL
        ? await writingApi.startToeflEmail()
        : await writingApi.startToeflDiscussion();
      return data;
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to start the TOEFL task'));
    }
  },
);

interface SliceThunkConfig extends RejectValue {
  state: { writing: WritingState };
}

export const submitSession = createAsyncThunk<
  { submissionId: string; willCountForProgress: boolean; attemptNumber: number },
  string,
  SliceThunkConfig
>('writing/submitSession', async (text, { getState, rejectWithValue }) => {
  const sessionId = getState().writing.session?.sessionId;
  if (sessionId === undefined) return rejectWithValue('No active session');

  try {
    const { data } = await writingApi.submitSession(sessionId, text);
    return { submissionId: data.submissionId, willCountForProgress: data.willCountForProgress, attemptNumber: data.attemptNumber };
  } catch (e: unknown) {
    return rejectWithValue(errMsg(e, 'Failed to submit'));
  }
});

export const fetchSubmission = createAsyncThunk<WritingSubmission, string, RejectValue>(
  'writing/fetchSubmission',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await writingApi.getSubmission(id);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to fetch submission'));
    }
  },
);

export const fetchSubmissions = createAsyncThunk<WritingSubmission[], void, RejectValue>(
  'writing/fetchSubmissions',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await writingApi.getSubmissions();
      return data;
    } catch (e: unknown) {
      return rejectWithValue(errMsg(e, 'Failed to load history'));
    }
  },
);

export const writingSlice = createSlice({
  name: 'writing',
  initialState,
  reducers: {
    setDraftText: (state, action: PayloadAction<string>) => {
      state.draftText = action.payload;
    },
    setLevelFilter: (state, action: PayloadAction<string | null>) => {
      state.levelFilter = action.payload;
    },
    resetSession: () => initialState,
    setSubmissionTimeout: (state) => {
      state.pendingSubmissionId = null;
      state.submitting = false;
      state.submitError = 'Analysis took too long. Please try again.';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPrompts.pending, (state) => { state.promptsLoading = true; state.promptsError = null; })
      .addCase(fetchPrompts.fulfilled, (state, action) => { state.promptsLoading = false; state.prompts = action.payload; })
      .addCase(fetchPrompts.rejected, (state, action) => { state.promptsLoading = false; state.promptsError = action.payload ?? 'Unknown error'; });

    const applySessionStart = (state: WritingState, action: PayloadAction<StartSessionResponse>) => {
      state.sessionStarting = false;
      state.session = action.payload;
      state.draftText = '';
      state.pendingSubmissionId = null;
      state.willCountForProgress = null;
      state.attemptNumber = null;
      state.currentSubmission = null;
      state.submitError = null;
    };

    builder
      .addCase(startSession.pending, (state) => { state.sessionStarting = true; state.sessionError = null; })
      .addCase(startSession.fulfilled, applySessionStart)
      .addCase(startSession.rejected, (state, action) => { state.sessionStarting = false; state.sessionError = action.payload ?? 'Unknown error'; });

    builder
      .addCase(startToeflSession.pending, (state) => { state.sessionStarting = true; state.sessionError = null; })
      .addCase(startToeflSession.fulfilled, applySessionStart)
      .addCase(startToeflSession.rejected, (state, action) => { state.sessionStarting = false; state.sessionError = action.payload ?? 'Unknown error'; });

    builder
      .addCase(submitSession.pending, (state) => { state.submitting = true; state.submitError = null; })
      .addCase(submitSession.fulfilled, (state, action) => {
        state.submitting = false;
        state.pendingSubmissionId = action.payload.submissionId;
        state.willCountForProgress = action.payload.willCountForProgress;
        state.attemptNumber = action.payload.attemptNumber;
      })
      .addCase(submitSession.rejected, (state, action) => { state.submitting = false; state.submitError = action.payload ?? 'Unknown error'; });

    builder
      .addCase(fetchSubmission.pending, (state) => { state.submissionLoading = true; state.submissionError = null; })
      .addCase(fetchSubmission.fulfilled, (state, action) => {
        state.submissionLoading = false;
        state.currentSubmission = action.payload;
        if (action.payload.status !== 'PENDING') state.pendingSubmissionId = null;
      })
      .addCase(fetchSubmission.rejected, (state, action) => { state.submissionLoading = false; state.submissionError = action.payload ?? 'Unknown error'; });

    builder
      .addCase(fetchSubmissions.pending, (state) => { state.submissionsLoading = true; })
      .addCase(fetchSubmissions.fulfilled, (state, action) => { state.submissionsLoading = false; state.submissions = action.payload; })
      .addCase(fetchSubmissions.rejected, (state) => { state.submissionsLoading = false; });
  },
});

export const { setDraftText, setLevelFilter, resetSession, setSubmissionTimeout } = writingSlice.actions;