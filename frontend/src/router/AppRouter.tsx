import { Routes, Route, Navigate } from 'react-router-dom';
// import { useAuthStore } from '../store/Slices/AuthSlice';
import AppShell from '../components/layout/AppShell';

// function Protected({ children }: { children: React.ReactNode }) {
//   const { isAuthenticated } = useAuthStore();
//   if (!isAuthenticated) return <Navigate to="/login" replace />;
//   return <AppShell>{children}</AppShell>;
// }

// function AdminRoute({ children }: { children: React.ReactNode }) {
//   const { user } = useAuthStore();
//   if (user?.role !== 'admin') return <Navigate to="/" replace />;
//   return <>{children}</>;
// }

export default function AppRouter() {
  return (
    <Routes>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
