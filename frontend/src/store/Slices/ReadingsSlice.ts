import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { QuestionResult, ReadingMaterial, SubmitReadingPayload, SubmitReadingResult } from '@/types/reading/Reading.types';
import { readingsApi } from '@/api';


type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

type QuizPhase = 'reading' | 'answering' | 'submitted';

interface ReadingsState {
    list: ReadingMaterial[];
    listStatus: AsyncStatus;
    listError: string | null;
    levelFilter: string;
    topicSearch: string;

    current: ReadingMaterial | null;
    currentStatus: AsyncStatus;
    currentError: string | null;

    quizAnswers: Record<number, number>;
    quizPhase: QuizPhase;
    submitStatus: AsyncStatus;
    submitError: string | null;
    results: QuestionResult[] | null;
    accuracy: number | null;
    xpEarned: number | null;
}

const initialState: ReadingsState = {
    list: [],
    listStatus: 'idle',
    listError: null,
    levelFilter: '',
    topicSearch: '',

    current: null,
    currentStatus: 'idle',
    currentError: null,

    quizAnswers: {},
    quizPhase: 'reading',
    submitStatus: 'idle',
    submitError: null,
    results: null,
    accuracy: null,
    xpEarned: null,
};


export const fetchReadingList = createAsyncThunk<
    ReadingMaterial[],
    { level?: string; topic?: string },
    { rejectValue: string }
>('readings/fetchList', async (params, { rejectWithValue }) => {
    try {
        const { data } = await readingsApi.getList(params);
        return data;
    } catch (err: unknown) {
        return rejectWithValue(err instanceof Error ? err.message : 'Failed to load readings');
    }
});

export const fetchReadingBySlug = createAsyncThunk<
    ReadingMaterial,
    string,
    { rejectValue: string }
>('readings/fetchBySlug', async (slug, { rejectWithValue }) => {
    try {
        const { data } = await readingsApi.getBySlug(slug);
        return data;
    } catch (err: unknown) {
        return rejectWithValue(err instanceof Error ? err.message : 'Failed to load article');
    }
});

export const submitReadingAnswers = createAsyncThunk<
    SubmitReadingResult,
    SubmitReadingPayload,
    { rejectValue: string }
>('readings/submit', async (payload, { rejectWithValue }) => {
    try {
        const { data } = await readingsApi.submit(payload);
        return data;
    } catch (err: unknown) {
        return rejectWithValue(err instanceof Error ? err.message : 'Failed to submit answers');
    }
});


export const readingsSlice = createSlice({
    name: 'readings',
    initialState,
    reducers: {
        setLevelFilter: (state, action: PayloadAction<string>) => {
            state.levelFilter = action.payload;
        },
        setTopicSearch: (state, action: PayloadAction<string>) => {
            state.topicSearch = action.payload;
        },
        clearCurrent: (state) => {
            state.current = null;
            state.currentStatus = 'idle';
            state.currentError = null;
            state.quizAnswers = {};
            state.quizPhase = 'reading';
            state.submitStatus = 'idle';
            state.submitError = null;
            state.results = null;
            state.accuracy = null;
            state.xpEarned = null;
        },
        setQuizAnswer: (state, action: PayloadAction<{ questionIdx: number; optionIdx: number }>) => {
            state.quizAnswers[action.payload.questionIdx] = action.payload.optionIdx;
        },
        setQuizPhase: (state, action: PayloadAction<QuizPhase>) => {
            state.quizPhase = action.payload;
        },
        resetQuiz: (state) => {
            state.quizAnswers = {};
            state.quizPhase = 'reading';
            state.submitStatus = 'idle';
            state.submitError = null;
            state.results = null;
            state.accuracy = null;
            state.xpEarned = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchReadingList.pending, (state) => {
                state.listStatus = 'loading';
                state.listError = null;
            })
            .addCase(fetchReadingList.fulfilled, (state, action) => {
                state.list = action.payload;
                state.listStatus = 'success';
            })
            .addCase(fetchReadingList.rejected, (state, action) => {
                state.listStatus = 'error';
                state.listError = action.payload ?? 'Unknown error';
            });

        builder
            .addCase(fetchReadingBySlug.pending, (state) => {
                state.currentStatus = 'loading';
                state.currentError = null;
                state.current = null;
                state.quizAnswers = {};
                state.quizPhase = 'reading';
                state.results = null;
            })
            .addCase(fetchReadingBySlug.fulfilled, (state, action) => {
                state.current = action.payload;
                state.currentStatus = 'success';
            })
            .addCase(fetchReadingBySlug.rejected, (state, action) => {
                state.currentStatus = 'error';
                state.currentError = action.payload ?? 'Unknown error';
            });

        builder
            .addCase(submitReadingAnswers.pending, (state) => {
                state.submitStatus = 'loading';
                state.submitError = null;
            })
            .addCase(submitReadingAnswers.fulfilled, (state, action) => {
                state.submitStatus = 'success';
                state.results = action.payload.results;
                state.accuracy = action.payload.accuracy;
                state.xpEarned = action.payload.xpEarned;
                state.quizPhase = 'submitted';
            })
            .addCase(submitReadingAnswers.rejected, (state, action) => {
                state.submitStatus = 'error';
                state.submitError = action.payload ?? 'Unknown error';
            });
    },
});

export const {
    setLevelFilter,
    setTopicSearch,
    clearCurrent,
    setQuizAnswer,
    setQuizPhase,
    resetQuiz,
} = readingsSlice.actions;


export interface ReadingsRootState { readings: ReadingsState }

export const selectReadingList = (s: ReadingsRootState) => s.readings.list;
export const selectReadingListStatus = (s: ReadingsRootState) => s.readings.listStatus;
export const selectReadingListError = (s: ReadingsRootState) => s.readings.listError;
export const selectLevelFilter = (s: ReadingsRootState) => s.readings.levelFilter;
export const selectTopicSearch = (s: ReadingsRootState) => s.readings.topicSearch;

export const selectCurrentReading = (s: ReadingsRootState) => s.readings.current;
export const selectCurrentStatus = (s: ReadingsRootState) => s.readings.currentStatus;
export const selectCurrentError = (s: ReadingsRootState) => s.readings.currentError;

export const selectQuizAnswers = (s: ReadingsRootState) => s.readings.quizAnswers;
export const selectQuizPhase = (s: ReadingsRootState) => s.readings.quizPhase;
export const selectSubmitStatus = (s: ReadingsRootState) => s.readings.submitStatus;
export const selectSubmitError = (s: ReadingsRootState) => s.readings.submitError;
export const selectQuizResults = (s: ReadingsRootState) => s.readings.results;
export const selectAccuracy = (s: ReadingsRootState) => s.readings.accuracy;
export const selectXpEarned = (s: ReadingsRootState) => s.readings.xpEarned;

export const selectAnsweredCount = (s: ReadingsRootState) =>
    Object.keys(s.readings.quizAnswers).length;

export const selectFilteredList = (s: ReadingsRootState) => {
    const { list, levelFilter, topicSearch } = s.readings;
    return list.filter((item) => {
        const matchLevel = levelFilter === '' || item.level === levelFilter;
        const matchTopic = topicSearch === '' ||
            item.topic.toLowerCase().includes(topicSearch.toLowerCase()) ||
            item.title.toLowerCase().includes(topicSearch.toLowerCase());
        return matchLevel && matchTopic;
    });
};