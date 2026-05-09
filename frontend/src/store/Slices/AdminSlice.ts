import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { adminApi } from '@/api/services/admin';
import type { AdminStats, ContentType, ImportLog, ImportResult } from '@/types/admin/Admin.types';


type ImportStatus = 'idle' | 'loading' | 'success' | 'error';

interface ImportTypeState {
    status: ImportStatus;
    result: ImportResult | null;
    error: string | null;
    lastImportAt: string | null;
}

const makeIdleImportState = (): ImportTypeState => ({
    status: 'idle',
    result: null,
    error: null,
    lastImportAt: null,
});


interface AdminState {
    stats: AdminStats | null;
    statsStatus: 'idle' | 'loading' | 'success' | 'error';
    statsError: string | null;
    imports: Record<ContentType, ImportTypeState>;
    log: ImportLog[];
}

const ALL_TYPES: ContentType[] = [
    'exercises', 'grammarRules', 'vocabulary', 'readings',
    'multipleChoice', 'writingPrompts', 'listening',
];

const initialImports = ALL_TYPES.reduce(
    (acc, key) => ({ ...acc, [key]: makeIdleImportState() }),
    {} as Record<ContentType, ImportTypeState>,
);

const initialState: AdminState = {
    stats: null,
    statsStatus: 'idle',
    statsError: null,
    imports: initialImports,
    log: [],
};


export const fetchAdminStats = createAsyncThunk<AdminStats, void, { rejectValue: string }>(
    'admin/fetchStats',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await adminApi.getStats();
            return data;
        } catch (error: unknown) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to load stats');
        }
    },
);

interface ImportPayload { type: ContentType; data: unknown[] }

export const importContent = createAsyncThunk<
    { type: ContentType; result: ImportResult },
    ImportPayload,
    { rejectValue: { type: ContentType; message: string } }
>(
    'admin/importContent',
    async ({ type, data }, { rejectWithValue }) => {
        try {
            const call = (() => {
                switch (type) {
                    case 'exercises': return adminApi.importExercises(data);
                    case 'grammarRules': return adminApi.importGrammarRules(data);
                    case 'vocabulary': return adminApi.importVocabulary(data);
                    case 'readings': return adminApi.importReadings(data);
                    case 'multipleChoice': return adminApi.importMultipleChoice(data);
                    case 'writingPrompts': return adminApi.importWritingPrompts(data);
                    case 'listening': return adminApi.importListening(data);
                }
            })();
            const { data: result } = await call;
            return { type, result };
        } catch (error: unknown) {
            return rejectWithValue({
                type,
                message: error instanceof Error ? error.message : 'Import failed',
            });
        }
    },
);


let _logId = 0;
const nextId = () => String((_logId += 1));

export const adminSlice = createSlice({
    name: 'admin',
    initialState,
    reducers: {
        clearLog: (state) => { state.log = []; },
        resetImportState: (state, action: PayloadAction<ContentType>) => {
            state.imports[action.payload] = makeIdleImportState();
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAdminStats.pending, (state) => {
                state.statsStatus = 'loading';
                state.statsError = null;
            })
            .addCase(fetchAdminStats.fulfilled, (state, action) => {
                state.statsStatus = 'success';
                state.stats = action.payload;
            })
            .addCase(fetchAdminStats.rejected, (state, action) => {
                state.statsStatus = 'error';
                state.statsError = action.payload ?? 'Unknown error';
            })
            .addCase(importContent.pending, (state, action) => {
                state.imports[action.meta.arg.type] = {
                    status: 'loading', result: null, error: null, lastImportAt: null,
                };
            })
            .addCase(importContent.fulfilled, (state, action) => {
                const { type, result } = action.payload;
                const now = new Date().toISOString();
                state.imports[type] = { status: 'success', result, error: null, lastImportAt: now };
                state.log = [
                    { id: nextId(), type, result, timestamp: now, status: 'success'  as const },
                    ...state.log,
                ].slice(0, 100);
            })
            .addCase(importContent.rejected, (state, action) => {
                const type = action.payload?.type ?? ('exercises' as ContentType);
                const message = action.payload?.message ?? 'Unknown error';
                const now = new Date().toISOString();
                state.imports[type] = { status: 'error', result: null, error: message, lastImportAt: now };
                state.log = [
                    {
                        id: nextId(), type,
                        result: { totalProcessed: 0, inserted: 0, skipped: 0 },
                        timestamp: now, status: 'error' as const, errorMessage: message,
                    },
                    ...state.log,
                ].slice(0, 100);
            });
    },
});

export const { clearLog, resetImportState } = adminSlice.actions;


export interface AdminRootState { admin: AdminState }

export const selectAdminStats = (s: AdminRootState) => s.admin.stats;
export const selectAdminStatsStatus = (s: AdminRootState) => s.admin.statsStatus;
export const selectAdminLog = (s: AdminRootState) => s.admin.log;
export const selectImportState = (type: ContentType) => (s: AdminRootState) => s.admin.imports[type];
export const selectTotalInserted = (s: AdminRootState) =>
    s.admin.log.filter((l) => l.status === 'success').reduce((n, l) => n + l.result.inserted, 0);
export const selectErrorCount = (s: AdminRootState) =>
    s.admin.log.filter((l) => l.status === 'error').length;