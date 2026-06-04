import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  writingApi,
  type GetPromptsParams,
  type SubmissionWithPrompt,
} from '@/api/services/writing';
import type { WritingPrompt, WritingSubmission } from '@/types/writing/Writing.types';

// ─── State ────────────────────────────────────────────────────────────────────

interface WritingState {
  // Prompt list
  prompts: WritingPrompt[];
  promptsLoading: boolean;
  promptsError: string | null;

  // Current prompt (editor view)
  currentPrompt: WritingPrompt | null;
  promptLoading: boolean;
  promptError: string | null;

  // Editor
  draftText: string;
  submitting: boolean;
  submitError: string | null;

  // Active submission being analyzed (poll target)
  pendingSubmissionId: string | null;

  // Resolved submission (ANALYZED or ERROR)
  currentSubmission: WritingSubmission | null;
  submissionLoading: boolean;
  submissionError: string | null;

  // History
  submissions: SubmissionWithPrompt[];
  submissionsLoading: boolean;

  // Filters
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
  currentSubmission: null,
  submissionLoading: false,
  submissionError: null,

  submissions: [],
  submissionsLoading: false,

  filters: { level: null, type: null },
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchPrompts = createAsyncThunk<
  WritingPrompt[],
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
  string, // returns submissionId
  { promptId: string; text: string },
  { rejectValue: string }
>('writing/submit', async ({ promptId, text }, { rejectWithValue }) => {
  try {
    const { data } = await writingApi.submit({ promptId, text });
    return data.submissionId;
  } catch (e: unknown) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to submit');
  }
});

// Called repeatedly by polling loop in the component
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

// ─── Slice ────────────────────────────────────────────────────────────────────

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
      state.currentSubmission = null;
      state.submissionError = null;
      state.currentPrompt = null;
    },
  },

  extraReducers: (builder) => {
    // fetchPrompts
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

    // fetchPromptById
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

    // submitWriting
    builder
      .addCase(submitWriting.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
        state.currentSubmission = null;
        state.pendingSubmissionId = null;
      })
      .addCase(submitWriting.fulfilled, (state, action) => {
        state.submitting = false;
        state.pendingSubmissionId = action.payload;
      })
      .addCase(submitWriting.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload ?? 'Unknown error';
      });

    // fetchSubmission (polling)
    builder
      .addCase(fetchSubmission.pending, (state) => {
        state.submissionLoading = true;
        state.submissionError = null;
      })
      .addCase(fetchSubmission.fulfilled, (state, action) => {
        state.submissionLoading = false;
        state.currentSubmission = action.payload;
        // Stop tracking pending once resolved
        if (action.payload.status !== 'PENDING') {
          state.pendingSubmissionId = null;
        }
      })
      .addCase(fetchSubmission.rejected, (state, action) => {
        state.submissionLoading = false;
        state.submissionError = action.payload ?? 'Unknown error';
      });

    // fetchSubmissions (history)
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
  },
});

export const { setDraftText, setFilter, clearEditor } = writingSlice.actions;
