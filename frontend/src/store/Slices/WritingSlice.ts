import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  writingApi,
  type GetPromptsParams,
  type SubmissionWithPrompt,
} from '@/api/services/writing';
import type {
  WritingPromptWithStatus,
  WritingPrompt,
  WritingSubmission,
  WritingUserStats,
} from '@/types/writing/Writing.types';



interface WritingState {
  prompts: WritingPromptWithStatus[];
  promptsLoading: boolean;
  promptsError: string | null;

  currentPrompt: WritingPrompt | null;
  promptLoading: boolean;
  promptError: string | null;

  draftText: string;
  submitting: boolean;
  submitError: string | null;

  pendingSubmissionId: string | null;

  willCountForProgress: boolean | null;
  attemptNumber: number | null;

  currentSubmission: WritingSubmission | null;
  submissionLoading: boolean;
  submissionError: string | null;

  submissions: SubmissionWithPrompt[];
  submissionsLoading: boolean;


  userStats: WritingUserStats | null;
  userStatsLoading: boolean;

  filters: {
    level: string | null;
    type: string | null;
  };
}

const initialState: WritingState = {
  prompts: [],
  promptsLoading: false,
  promptsError: null,

  currentPrompt: null,
  promptLoading: false,
  promptError: null,

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

  userStats: null,
  userStatsLoading: false,

  filters: { level: null, type: null },
};



export const fetchPrompts = createAsyncThunk<
  WritingPromptWithStatus[],
  GetPromptsParams | undefined,
  { rejectValue: string }
>('writing/fetchPrompts', async (params, { rejectWithValue }) => {
  try {
    const { data } = await writingApi.getPrompts(params);
    return data;
  } catch (e: unknown) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to load prompts');
  }
});

export const fetchPromptById = createAsyncThunk<WritingPrompt, string, { rejectValue: string }>(
  'writing/fetchPromptById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await writingApi.getPromptById(id);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to load prompt');
    }
  },
);

export const submitWriting = createAsyncThunk<
  { submissionId: string; willCountForProgress: boolean; attemptNumber: number },
  { promptId: string; text: string },
  { rejectValue: string }
>('writing/submit', async ({ promptId, text }, { rejectWithValue }) => {
  try {
    const { data } = await writingApi.submit({ promptId, text });
    return {
      submissionId: data.submissionId,
      willCountForProgress: data.willCountForProgress,
      attemptNumber: data.attemptNumber,
    };
  } catch (e: unknown) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to submit');
  }
});

export const fetchSubmission = createAsyncThunk<WritingSubmission, string, { rejectValue: string }>(
  'writing/fetchSubmission',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await writingApi.getSubmission(id);
      return data;
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to fetch submission');
    }
  },
);

export const fetchSubmissions = createAsyncThunk<
  SubmissionWithPrompt[],
  string | undefined,
  { rejectValue: string }
>('writing/fetchSubmissions', async (promptId, { rejectWithValue }) => {
  try {
    const { data } = await writingApi.getSubmissions(promptId);
    return data;
  } catch (e: unknown) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to load history');
  }
});

export const fetchUserStats = createAsyncThunk<WritingUserStats, void, { rejectValue: string }>(
  'writing/fetchUserStats',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await writingApi.getUserStats();
      return data;
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to load stats');
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

    setFilter: (state, action: PayloadAction<{ key: 'level' | 'type'; value: string | null }>) => {
      state.filters[action.payload.key] = action.payload.value;
    },

    clearEditor: (state) => {
      state.draftText = '';
      state.submitError = null;
      state.pendingSubmissionId = null;
      state.willCountForProgress = null;
      state.attemptNumber = null;
      state.currentSubmission = null;
      state.submissionError = null;
      state.currentPrompt = null;
    },
    setSubmissionTimeout: (state) => {
      state.pendingSubmissionId = null;
      state.submitting = false;
      state.currentSubmission = {
        ...state.currentSubmission,
        status: 'ERROR', 
      } as any;
      state.submitError = 'Analysis took too long. Please try again.';
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchPrompts.pending, (state) => {
        state.promptsLoading = true;
        state.promptsError = null;
      })
      .addCase(fetchPrompts.fulfilled, (state, action) => {
        state.promptsLoading = false;
        state.prompts = action.payload;
      })
      .addCase(fetchPrompts.rejected, (state, action) => {
        state.promptsLoading = false;
        state.promptsError = action.payload ?? 'Unknown error';
      });

    builder
      .addCase(fetchPromptById.pending, (state) => {
        state.promptLoading = true;
        state.promptError = null;
      })
      .addCase(fetchPromptById.fulfilled, (state, action) => {
        state.promptLoading = false;
        state.currentPrompt = action.payload;
      })
      .addCase(fetchPromptById.rejected, (state, action) => {
        state.promptLoading = false;
        state.promptError = action.payload ?? 'Unknown error';
      });

    builder
      .addCase(submitWriting.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
        state.currentSubmission = null;
        state.pendingSubmissionId = null;
        state.willCountForProgress = null;
        state.attemptNumber = null;
      })
      .addCase(submitWriting.fulfilled, (state, action) => {
        state.submitting = false;
        state.pendingSubmissionId = action.payload.submissionId;
        state.willCountForProgress = action.payload.willCountForProgress;
        state.attemptNumber = action.payload.attemptNumber;
      })
      .addCase(submitWriting.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload ?? 'Unknown error';
      });

    builder
      .addCase(fetchSubmission.pending, (state) => {
        state.submissionLoading = true;
        state.submissionError = null;
      })
      .addCase(fetchSubmission.fulfilled, (state, action) => {
        state.submissionLoading = false;
        state.currentSubmission = action.payload;
        if (action.payload.status !== 'PENDING') {
          state.pendingSubmissionId = null;
        }
      })
      .addCase(fetchSubmission.rejected, (state, action) => {
        state.submissionLoading = false;
        state.submissionError = action.payload ?? 'Unknown error';
      });

    builder
      .addCase(fetchSubmissions.pending, (state) => {
        state.submissionsLoading = true;
      })
      .addCase(fetchSubmissions.fulfilled, (state, action) => {
        state.submissionsLoading = false;
        state.submissions = action.payload;
      })
      .addCase(fetchSubmissions.rejected, (state) => {
        state.submissionsLoading = false;
      });

    builder
      .addCase(fetchUserStats.pending, (state) => {
        state.userStatsLoading = true;
      })
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        state.userStatsLoading = false;
        state.userStats = action.payload;
      })
      .addCase(fetchUserStats.rejected, (state) => {
        state.userStatsLoading = false;
      });
  },
});

export const { setDraftText, setFilter, clearEditor,setSubmissionTimeout } = writingSlice.actions;