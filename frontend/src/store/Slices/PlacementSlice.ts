import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { placementApi } from '@/api/index';
import type { PlacementStatus, PublicQuestion } from '@/types/Placement/Placement.types';



export interface PlacementState {

    status: PlacementStatus | null;
    showBanner: boolean;
    detectedLevel: string | null;
    confidenceScore: number | null;
    statusLoaded: boolean;


    currentQuestion: PublicQuestion | null;
    questionsAnswered: number;
    maxQuestions: number;


    lastAnswerCorrect: boolean | null;


    isLoadingStatus: boolean;
    isStarting: boolean;
    isAnswering: boolean;
    isSkipping: boolean;
    isReminding: boolean;

    error: string | null;
}

const initialState: PlacementState = {
    status: null,
    showBanner: false,
    detectedLevel: null,
    confidenceScore: null,
    statusLoaded: false,

    currentQuestion: null,
    questionsAnswered: 0,
    maxQuestions: 20,

    lastAnswerCorrect: null,

    isLoadingStatus: false,
    isStarting: false,
    isAnswering: false,
    isSkipping: false,
    isReminding: false,

    error: null,
};



export const fetchPlacementStatus = createAsyncThunk(
    'placement/fetchStatus',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await placementApi.getStatus();
            return data;
        } catch (error: unknown) {
            return rejectWithValue(
                error instanceof Error ? error.message : 'Failed to fetch placement status',
            );
        }
    },
);

export const startPlacementTest = createAsyncThunk(
    'placement/start',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await placementApi.start();
            return data;
        } catch (error: unknown) {
            return rejectWithValue(
                error instanceof Error ? error.message : 'Failed to start placement test',
            );
        }
    },
);

export const answerPlacementQuestion = createAsyncThunk(
    'placement/answer',
    async (
        { questionIndex, selectedIndex }: { questionIndex: number; selectedIndex: number },
        { rejectWithValue },
    ) => {
        try {
            const { data } = await placementApi.answer(questionIndex, selectedIndex);
            return data;
        } catch (error: unknown) {
            return rejectWithValue(
                error instanceof Error ? error.message : 'Failed to submit answer',
            );
        }
    },
);

export const skipPlacementTest = createAsyncThunk(
    'placement/skip',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await placementApi.skip();
            return data;
        } catch (error: unknown) {
            return rejectWithValue(
                error instanceof Error ? error.message : 'Failed to skip placement test',
            );
        }
    },
);

export const remindLaterPlacement = createAsyncThunk(
    'placement/remindLater',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await placementApi.remindLater();
            return data;
        } catch (error: unknown) {
            return rejectWithValue(
                error instanceof Error ? error.message : 'Failed to set reminder',
            );
        }
    },
);



export const placementSlice = createSlice({
    name: 'placement',
    initialState,
    reducers: {

        clearLastAnswerFeedback: (state) => {
            state.lastAnswerCorrect = null;
        },

        dismissBannerLocally: (state) => {
            state.showBanner = false;
        },
        clearPlacementError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder

            .addCase(fetchPlacementStatus.pending, (state) => {
                state.isLoadingStatus = true;
                state.error = null;
            })
            .addCase(fetchPlacementStatus.fulfilled, (state, action) => {
                state.isLoadingStatus = false;
                state.statusLoaded = true;
                state.status = action.payload.status;
                state.showBanner = action.payload.showBanner;
                state.detectedLevel = action.payload.detectedLevel;
                state.confidenceScore = action.payload.confidenceScore;
            })
            .addCase(fetchPlacementStatus.rejected, (state, action) => {
                state.isLoadingStatus = false;
                state.statusLoaded = true;
                state.error = action.payload as string;
            })


            .addCase(startPlacementTest.pending, (state) => {
                state.isStarting = true;
                state.error = null;

                state.currentQuestion = null;
                state.questionsAnswered = 0;
                state.lastAnswerCorrect = null;
            })
            .addCase(startPlacementTest.fulfilled, (state, action) => {
                state.isStarting = false;
                state.status = 'IN_PROGRESS';
                state.showBanner = false;
                state.currentQuestion = action.payload.nextQuestion;
                state.maxQuestions = action.payload.maxQuestions;
                state.questionsAnswered = 0;
            })
            .addCase(startPlacementTest.rejected, (state, action) => {
                state.isStarting = false;
                state.error = action.payload as string;
            })


            .addCase(answerPlacementQuestion.pending, (state) => {
                state.isAnswering = true;
                state.error = null;
            })
            .addCase(answerPlacementQuestion.fulfilled, (state, action) => {
                state.isAnswering = false;
                const payload = action.payload;

                if (payload.converged) {

                    state.status = 'COMPLETED';
                    state.detectedLevel = payload.detectedLevel;
                    state.confidenceScore = payload.confidenceScore;
                    state.questionsAnswered = payload.questionsAnswered;
                    state.currentQuestion = null;
                    state.showBanner = false;
                } else {

                    state.lastAnswerCorrect = payload.isCorrect;
                    state.questionsAnswered = payload.questionsAnswered;
                    state.currentQuestion = payload.nextQuestion;
                }
            })
            .addCase(answerPlacementQuestion.rejected, (state, action) => {
                state.isAnswering = false;
                state.error = action.payload as string;
            })


            .addCase(skipPlacementTest.pending, (state) => {
                state.isSkipping = true;
                state.error = null;
            })
            .addCase(skipPlacementTest.fulfilled, (state) => {
                state.isSkipping = false;
                state.status = 'SKIPPED';
                state.showBanner = false;
                state.detectedLevel = 'A1';
            })
            .addCase(skipPlacementTest.rejected, (state, action) => {
                state.isSkipping = false;
                state.error = action.payload as string;
            })


            .addCase(remindLaterPlacement.pending, (state) => {
                state.isReminding = true;
                state.error = null;
            })
            .addCase(remindLaterPlacement.fulfilled, (state) => {
                state.isReminding = false;
                state.status = 'REMIND_LATER';
                state.showBanner = false;
            })
            .addCase(remindLaterPlacement.rejected, (state, action) => {
                state.isReminding = false;
                state.error = action.payload as string;
            });
    },
});

export const {
    clearLastAnswerFeedback,
    dismissBannerLocally,
    clearPlacementError,
} = placementSlice.actions;