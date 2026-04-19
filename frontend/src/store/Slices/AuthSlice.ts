import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User  } from '@/types/auth/Auth.types';

interface AuthState {
  // Access token lives ONLY in memory.
  // On page reload, App.tsx calls POST /auth/refresh to restore it via HttpOnly cookie.
  accessToken: string | null;
  user: User | null;
  // True while the initial POST /auth/refresh check is in flight.
  // Keeps ProtectedRoute showing a spinner instead of redirecting to /login.
  isInitializing: boolean;
}

const initialState: AuthState = {
  accessToken: null,
  user: null,
  isInitializing: true,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{ accessToken: string; user: User }>) => {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
    },

    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },

    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },

    clearAuth: (state) => {
      state.accessToken = null;
      state.user = null;
    },

    setInitializing: (state, action: PayloadAction<boolean>) => {
      state.isInitializing = action.payload;
    },
  },
});

export const { setAuth, setAccessToken, setUser, clearAuth, setInitializing } =
  authSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export interface AuthRootState {
  auth: AuthState;
}

export const selectAccessToken = (state: AuthRootState): string | null =>
  state.auth.accessToken;

export const selectUser = (state: AuthRootState): User | null =>
  state.auth.user;

export const selectIsInitializing = (state: AuthRootState): boolean =>
  state.auth.isInitializing;

// Both token AND user must exist for the session to be valid
export const selectIsAuthenticated = (state: AuthRootState): boolean =>
  state.auth.accessToken !== null && state.auth.user !== null;