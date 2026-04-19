import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@/store/store';
import { setAccessToken, setUser, clearAuth, setInitializing } from '@/store/Slices/AuthSlice';
import { authApi } from '@/api/api';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './AuthCallbackPage.module.css';

export function AuthCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const handleCallback = async (): Promise<void> => {
      const oauthError = searchParams.get('error');
      if (oauthError !== null) {
        navigate(`/login?error=${oauthError}`, { replace: true });
        return;
      }

      const token = searchParams.get('token');
      if (token === null || token.length === 0) {
        navigate('/login?error=no_token', { replace: true });
        return;
      }

      // Remove token from URL immediately — never leave it in browser history
      window.history.replaceState({}, document.title, '/auth/callback');

      try {
        dispatch(setAccessToken(token));
        const { data: user } = await authApi.getMe();
        dispatch(setUser(user));
        dispatch(setInitializing(false));
        navigate('/dashboard', { replace: true });
      } catch {
        dispatch(clearAuth());
        dispatch(setInitializing(false));
        navigate('/login?error=auth_failed', { replace: true });
      }
    };

    void handleCallback();
  }, []); // intentionally empty — run exactly once

  return (
    <div className={styles['root']}>
      <FullPageSpinner label={t('auth.redirecting')} />
    </div>
  );
}