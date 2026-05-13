import { MultipleChoiceApi, type GetMCParams } from "@/api/services/multiple-choice";
import type { MultipleChoice } from "@/types/multipleChoice/MultipleChoice.types";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const AsyncMultipleChoiceSlice = createAsyncThunk<
    MultipleChoice[], 
    GetMCParams | undefined,
    { rejectValue: string }
>(
    "AsyncMultipleChoiceSlice",
    async (params, { rejectWithValue }) => {
        try {
            const { data } = await MultipleChoiceApi.getTasksMC(params);
            return data;
        } catch (error: unknown) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to load questions');
        }
    },
);

type InitialStateType = {
    data: MultipleChoice[] | null; 
    isLoading: boolean;
    error: string | null;
};

const initialState: InitialStateType = {
    data: null,
    isLoading: false,
    error: null,
};

const MultipleChoiceSlice = createSlice({
    name: "MultipleChoiceSlice",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(AsyncMultipleChoiceSlice.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(AsyncMultipleChoiceSlice.fulfilled, (state, action) => {
                state.data = action.payload;
                state.isLoading = false;
            })
            .addCase(AsyncMultipleChoiceSlice.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? 'Unknown error';
            })
    }
});

export default MultipleChoiceSlice;