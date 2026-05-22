import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import { authSlice } from './Slices/AuthSlice';
import { progressSlice } from './Slices/ProgressSlice';
import { adminSlice } from './Slices/AdminSlice';
import { readingsSlice } from './Slices/ReadingsSlice';
import { grammarRulesSlice } from './Slices/GrammarRulesSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    progress: progressSlice.reducer,
    admin: adminSlice.reducer,
    readings: readingsSlice.reducer,
    grammar: grammarRulesSlice.reducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
