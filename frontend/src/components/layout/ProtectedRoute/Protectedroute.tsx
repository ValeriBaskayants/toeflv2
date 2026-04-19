import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/store/store';
import { selectIsAuthenticated, selectIsInitializing } from '@/store/Slices/AuthSlice';
import { FullPageSpinner } from '@/components/ui/Spinner';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const isInitializing = useAppSelector(selectIsInitializing);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  if (isInitializing) {
    return <FullPageSpinner label={t('auth.sessionRestored')} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}