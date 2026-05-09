import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/store';
import { selectUser, selectIsInitializing } from '@/store/Slices/AuthSlice';
import { FullPageSpinner } from '@/components/ui/Spinner';

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const isInitializing = useAppSelector(selectIsInitializing);
  const user = useAppSelector(selectUser);

  if (isInitializing) {
    return <FullPageSpinner />;
  }

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}