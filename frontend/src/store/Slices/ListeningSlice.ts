import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { CompleteSessionResponse, GetListeningParams, ListeningMaterialDetail, ListeningMaterialListItem, ListeningNote, PlayResponse, SessionHistoryItem, StartSessionPayload, StartSessionResponse, SubmitAnswerResponse } from '@/types/listening/Listening.types';
import { listeningApi } from '@/api/index';



export interface AnswerRecord {
    questionId: string;
    selectedIndex: number;
    isCorrect?: boolean;
    correctIndex?: number;
    submitting: boolean;
    submitted: boolean;
}

interface ListeningState {

    materials: ListeningMaterialListItem[];
    materialsLoading: boolean;
    materialsError: string | null;


    currentMaterial: ListeningMaterialDetail | null;
    materialLoading: boolean;
    materialError: string | null;


    activeSession: StartSessionResponse | null;
    sessionLoading: boolean;
    sessionError: string | null;


    playCount: number;
    maxAllowedPlays: number;
    recordingPlay: boolean;


    answers: Record<string, AnswerRecord>;


    notes: ListeningNote[];
    notesSaving: boolean;


    sessionResult: CompleteSessionResponse | null;
    completing: boolean;
    completeError: string | null;


    history: SessionHistoryItem[];
    historyLoading: boolean;


    filters: {
        level: string | null;
        type: string | null;
        search: string;
    };
}

const initialState: ListeningState = {
    materials: [],
    materialsLoading: false,
    materialsError: null,

    currentMaterial: null,
    materialLoading: false,
    materialError: null,

    activeSession: null,
    sessionLoading: false,
    sessionError: null,

    playCount: 0,
    maxAllowedPlays: 99,
    recordingPlay: false,

    answers: {},
    notes: [],
    notesSaving: false,

    sessionResult: null,
    completing: false,
    completeError: null,

    history: [],
    historyLoading: false,

    filters: { level: null, type: null, search: '' },
};



export const fetchMaterials = createAsyncThunk<
    ListeningMaterialListItem[],
    GetListeningParams | undefined,
    { rejectValue: string }
>('listening/fetchMaterials', async (params, { rejectWithValue }) => {
    try {
        const { data } = await listeningApi.getAll(params);
        return data;
    } catch (e: unknown) {
        return rejectWithValue(e instanceof Error ? e.message : 'Failed to load');
    }
});

export const fetchMaterialById = createAsyncThunk<
    ListeningMaterialDetail,
    string,
    { rejectValue: string }
>('listening/fetchMaterialById', async (id, { rejectWithValue }) => {
    try {
        const { data } = await listeningApi.getById(id);
        return data;
    } catch (e: unknown) {
        return rejectWithValue(e instanceof Error ? e.message : 'Failed to load');
    }
});

export const startSession = createAsyncThunk<
    StartSessionResponse,
    StartSessionPayload,
    { rejectValue: string }
>('listening/startSession', async (payload, { rejectWithValue }) => {
    try {
        const { data } = await listeningApi.startSession(payload);
        return data;
    } catch (e: unknown) {
        return rejectWithValue(e instanceof Error ? e.message : 'Failed to start session');
    }
});

export const recordPlay = createAsyncThunk<
    PlayResponse,
    string,
    { rejectValue: string }
>('listening/recordPlay', async (sessionId, { rejectWithValue }) => {
    try {
        const { data } = await listeningApi.recordPlay(sessionId);
        return data;
    } catch (e: unknown) {
        return rejectWithValue(e instanceof Error ? e.message : 'Failed to record play');
    }
});

export const submitAnswer = createAsyncThunk<
    { questionId: string; response: SubmitAnswerResponse },
    { sessionId: string; questionId: string; selectedIndex: number; currentAudioSec?: number },
    { rejectValue: { questionId: string; message: string } }
>('listening/submitAnswer', async ({ sessionId, questionId, selectedIndex, currentAudioSec }, { rejectWithValue }) => {
    try {
        const payload = currentAudioSec === undefined
            ? { questionId, selectedIndex }
            : { questionId, selectedIndex, currentAudioSec };

        const { data } = await listeningApi.submitAnswer(sessionId, payload);
        return { questionId, response: data };
    } catch (e: unknown) {
        return rejectWithValue({
            questionId,
            message: e instanceof Error ? e.message : 'Failed to submit',
        });
    }
});

export const saveNotes = createAsyncThunk<
    void,
    { sessionId: string; notes: ListeningNote[] },
    { rejectValue: string }
>('listening/saveNotes', async ({ sessionId, notes }, { rejectWithValue }) => {
    try {
        await listeningApi.saveNotes(sessionId, { notes });
    } catch (e: unknown) {
        return rejectWithValue(e instanceof Error ? e.message : 'Failed to save notes');
    }
});

export const completeSession = createAsyncThunk<
    CompleteSessionResponse,
    string,
    { rejectValue: string }
>('listening/completeSession', async (sessionId, { rejectWithValue }) => {
    try {
        const { data } = await listeningApi.completeSession(sessionId);
        return data;
    } catch (e: unknown) {
        return rejectWithValue(e instanceof Error ? e.message : 'Failed to complete session');
    }
});

export const fetchHistory = createAsyncThunk<
    SessionHistoryItem[],
    string | undefined,
    { rejectValue: string }
>('listening/fetchHistory', async (materialId, { rejectWithValue }) => {
    try {
        const { data } = await listeningApi.getUserSessions(materialId);
        return data;
    } catch (e: unknown) {
        return rejectWithValue(e instanceof Error ? e.message : 'Failed to load history');
    }
});



export const listeningSlice = createSlice({
    name: 'listening',
    initialState,
    reducers: {
        setFilter: (
            state,
            action: PayloadAction<{ key: 'level' | 'type' | 'search'; value: string | null }>,
        ) => {
            if (action.payload.key === 'search') {
                state.filters.search = action.payload.value ?? '';
            } else {
                state.filters[action.payload.key] = action.payload.value;
            }
        },


        selectAnswer: (
            state,
            action: PayloadAction<{ questionId: string; selectedIndex: number }>,
        ) => {
            const { questionId, selectedIndex } = action.payload;
            const existing = state.answers[questionId];
            if (existing?.submitted) return;
            state.answers[questionId] = {
                questionId,
                selectedIndex,
                submitting: false,
                submitted: false,
            };
        },

        addNote: (state, action: PayloadAction<ListeningNote>) => {
            state.notes = [action.payload, ...state.notes];
        },

        removeNote: (state, action: PayloadAction<string>) => {
            state.notes = state.notes.filter((n) => n.id !== action.payload);
        },

        clearPlayerState: (state) => {
            state.currentMaterial = null;
            state.activeSession = null;
            state.sessionResult = null;
            state.answers = {};
            state.notes = [];
            state.playCount = 0;
            state.sessionError = null;
            state.completeError = null;
        },
    },

    extraReducers: (builder) => {
        builder
            .addCase(fetchMaterials.pending, (state) => {
                state.materialsLoading = true;
                state.materialsError = null;
            })
            .addCase(fetchMaterials.fulfilled, (state, action) => {
                state.materialsLoading = false;
                state.materials = action.payload;
            })
            .addCase(fetchMaterials.rejected, (state, action) => {
                state.materialsLoading = false;
                state.materialsError = action.payload ?? 'Unknown error';
            });

        builder
            .addCase(fetchMaterialById.pending, (state) => {
                state.materialLoading = true;
                state.materialError = null;
                state.currentMaterial = null;
            })
            .addCase(fetchMaterialById.fulfilled, (state, action) => {
                state.materialLoading = false;
                state.currentMaterial = action.payload;
                if (action.payload.openSession) {
                    const s = action.payload.openSession;
                    state.activeSession = {
                        id: s.id,
                        mode: s.mode,
                        maxAllowedPlays: s.maxAllowedPlays,
                        playCount: s.playCount,
                        startedAt: '',
                    };
                    state.playCount = s.playCount;
                    state.maxAllowedPlays = s.maxAllowedPlays;
                }
            })
            .addCase(fetchMaterialById.rejected, (state, action) => {
                state.materialLoading = false;
                state.materialError = action.payload ?? 'Unknown error';
            });

        builder
            .addCase(startSession.pending, (state) => {
                state.sessionLoading = true;
                state.sessionError = null;
                state.answers = {};
                state.notes = [];
                state.sessionResult = null;
                state.playCount = 0;
            })
            .addCase(startSession.fulfilled, (state, action) => {
                state.sessionLoading = false;
                state.activeSession = action.payload;
                state.maxAllowedPlays = action.payload.maxAllowedPlays;
                state.playCount = action.payload.playCount;
            })
            .addCase(startSession.rejected, (state, action) => {
                state.sessionLoading = false;
                state.sessionError = action.payload ?? 'Unknown error';
            });

        builder
            .addCase(recordPlay.pending, (state) => {
                state.recordingPlay = true;
            })
            .addCase(recordPlay.fulfilled, (state, action) => {
                state.recordingPlay = false;
                state.playCount = action.payload.playCount;
                state.maxAllowedPlays = action.payload.maxAllowedPlays;
            })
            .addCase(recordPlay.rejected, (state) => {
                state.recordingPlay = false;
            });

        builder
            .addCase(submitAnswer.pending, (state, action) => {
                const { questionId } = action.meta.arg;
                if (state.answers[questionId]) {
                    state.answers[questionId]!.submitting = true;
                }
            })
            .addCase(submitAnswer.fulfilled, (state, action) => {
                const { questionId, response } = action.payload;
                state.answers[questionId] = {
                    questionId,
                    selectedIndex: state.answers[questionId]?.selectedIndex ?? 0,
                    isCorrect: response.isCorrect,
                    correctIndex: response.correctIndex,
                    submitting: false,
                    submitted: true,
                };
            })
            .addCase(submitAnswer.rejected, (state, action) => {
                const qId = action.payload?.questionId;
                if (qId && state.answers[qId]) {
                    state.answers[qId]!.submitting = false;
                }
            });

        builder
            .addCase(saveNotes.pending, (state) => { state.notesSaving = true; })
            .addCase(saveNotes.fulfilled, (state) => { state.notesSaving = false; })
            .addCase(saveNotes.rejected, (state) => { state.notesSaving = false; });

        builder
            .addCase(completeSession.pending, (state) => {
                state.completing = true;
                state.completeError = null;
            })
            .addCase(completeSession.fulfilled, (state, action) => {
                state.completing = false;
                state.sessionResult = action.payload;
                state.activeSession = null;
            })
            .addCase(completeSession.rejected, (state, action) => {
                state.completing = false;
                state.completeError = action.payload ?? 'Unknown error';
            });

        builder
            .addCase(fetchHistory.pending, (state) => { state.historyLoading = true; })
            .addCase(fetchHistory.fulfilled, (state, action) => {
                state.historyLoading = false;
                state.history = action.payload;
            })
            .addCase(fetchHistory.rejected, (state) => { state.historyLoading = false; });
    },
});

export const { setFilter, selectAnswer, addNote, removeNote, clearPlayerState } =
    listeningSlice.actions;