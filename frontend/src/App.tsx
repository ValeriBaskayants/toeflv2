import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import axios from 'axios';
import { store } from '@/store/store';
import { setAccessToken, setUser, clearAuth, setInitializing } from '@/store/Slices/AuthSlice';
import { AppRouter } from '@/router/AppRouter';
import { authApi } from '@/api/api';
import { initTheme } from './hooks/useTheme/Usetheme';
import type { RefreshResponse } from './types/auth/Auth.types';
import '@/i18n';
import '@/styles/globals.css';

const BASE_URL = import.meta.env['VITE_API_BASE_URL'] as string;

// Apply saved theme immediately — prevents flash of wrong theme on load
initTheme();

async function initSession(): Promise<void> {
  try {
    const { data } = await axios.post<RefreshResponse>(
      `${BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    store.dispatch(setAccessToken(data.accessToken));
    const { data: user } = await authApi.getMe();
    store.dispatch(setUser(user));
  } catch {
    store.dispatch(clearAuth());
  } finally {
    store.dispatch(setInitializing(false));
  }
}

function AppInner() {
  useEffect(() => {
    void initSession();
  }, []);

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export function App() {
  return (
    <Provider store={store}>
      <AppInner />
    </Provider>
  );
}