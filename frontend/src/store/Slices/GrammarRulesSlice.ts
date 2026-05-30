import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { GrammarRuleDetail, GrammarRuleSummary } from '@/types/grammar/Grammar.types';
import { grammarRulesApi } from '@/api/services/grammar-rules';
import type { Level } from '@/types/globalTypes';

interface GrammarRulesState {
  list: GrammarRuleSummary[];
  listIsLoading: boolean;
  listError: string | null;
  activeLevel: Level | null;
  search: string;

  detail: GrammarRuleDetail | null;
  detailIsLoading: boolean;
  detailError: string | null;
  detailSlug: string | null;
}

const initialState: GrammarRulesState = {
  list: [],
  listIsLoading: false,
  listError: null,
  activeLevel: null,
  search: '',

  detail: null,
  detailIsLoading: false,
  detailError: null,
  detailSlug: null,
};

export const fetchGrammarRules = createAsyncThunk<
  GrammarRuleSummary[],
  Level | undefined,
  { rejectValue: string }
>('grammarRules/fetchAll', async (level, { rejectWithValue }) => {
  try {
    const { data } = await grammarRulesApi.getAll(level);
    return data;
  } catch (error: unknown) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to load grammar rules');
  }
});

export const fetchGrammarRuleDetail = createAsyncThunk<
  GrammarRuleDetail,
  string,
  { rejectValue: string }
>('grammarRules/fetchDetail', async (slug, { rejectWithValue }) => {
  try {
    const { data } = await grammarRulesApi.getBySlug(slug);
    return data;
  } catch (error: unknown) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to load grammar rule');
  }
});

export const grammarRulesSlice = createSlice({
  name: 'grammarRules',
  initialState,
  reducers: {
    setActiveLevel: (state, action: PayloadAction<Level | null>) => {
      state.activeLevel = action.payload;
    },
    setSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
    },
    clearDetail: (state) => {
      state.detail = null;
      state.detailError = null;
      state.detailIsLoading = false;
      state.detailSlug = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGrammarRules.pending, (state) => {
        state.listIsLoading = true;
        state.listError = null;
      })
      .addCase(fetchGrammarRules.fulfilled, (state, action) => {
        state.list = action.payload;
        state.listIsLoading = false;
      })
      .addCase(fetchGrammarRules.rejected, (state, action) => {
        state.listIsLoading = false;
        state.listError = action.payload ?? 'Unknown error';
      })

      .addCase(fetchGrammarRuleDetail.pending, (state, action) => {
        state.detailIsLoading = true;
        state.detailError = null;
        state.detailSlug = action.meta.arg;
        state.detail = null;
      })
      .addCase(fetchGrammarRuleDetail.fulfilled, (state, action) => {
        state.detail = action.payload;
        state.detailIsLoading = false;
      })
      .addCase(fetchGrammarRuleDetail.rejected, (state, action) => {
        state.detailIsLoading = false;
        state.detailError = action.payload ?? 'Unknown error';
      });
  },
});

export const { setActiveLevel, setSearch, clearDetail } = grammarRulesSlice.actions;

export const selectGrammarRulesList = (state: { grammar: GrammarRulesState }) => state.grammar.list;

export const selectGrammarRulesListIsLoading = (state: { grammar: GrammarRulesState }) =>
  state.grammar.listIsLoading;

export const selectGrammarRulesListError = (state: { grammar: GrammarRulesState }) =>
  state.grammar.listError;

export const selectActiveLevel = (state: { grammar: GrammarRulesState }) =>
  state.grammar.activeLevel;

export const selectGrammarSearch = (state: { grammar: GrammarRulesState }) => state.grammar.search;

export const selectFilteredGrammarRules = (state: { grammar: GrammarRulesState }) => {
  const { list, search } = state.grammar;
  if (search.trim().length === 0) {
    return list;
  }
  const q = search.toLowerCase();
  return list.filter(
    (r) =>
      r.topic.toLowerCase().includes(q) ||
      r.summary.toLowerCase().includes(q) ||
      r.signalWords.some((w: string) => w.toLowerCase().includes(q)),
  );
};

export const selectGrammarRuleDetail = (state: { grammar: GrammarRulesState }) =>
  state.grammar.detail;

export const selectGrammarRuleDetailIsLoading = (state: { grammar: GrammarRulesState }) =>
  state.grammar.detailIsLoading;

export const selectGrammarRuleDetailError = (state: { grammar: GrammarRulesState }) =>
  state.grammar.detailError;
