import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage/Loginpage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage/Authcallbackpage';
import { DashboardPage } from '@/pages/DashboardPage/DashboardPage';
import { AppShell } from '@/components/layout/AppShell/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute/Protectedroute';
import AdminPage from '@/pages/Adminpage/Adminpage';
import ProgressPage from '@/pages/ProgressPage/ProgressPage';
import ReadingListPage from '@/pages/ReadingListPage/ReadingListPage';
import ReadingReaderPage from '@/pages/ReadingReaderPage/ReadingReaderPage';

function ComingSoonPage({ title }: { title: string }) {
  return (
    <div style={{ padding: '2.5rem', color: 'var(--text-1)' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.75rem', marginBottom: '0.5rem' }}>
        {title}
      </h1>
      <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>This section is coming soon.</p>
    </div>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/writing" element={<ComingSoonPage title="Writing" />} />
        <Route path="/reading" element={<ReadingListPage />} />
        <Route path="/reading/:slug" element={<ReadingReaderPage />} />

        <Route path="/listening" element={<ComingSoonPage title="Listening" />} />
        <Route path="/speaking" element={<ComingSoonPage title="Speaking" />} />
        <Route path="/grammar" element={<ComingSoonPage title="Grammar" />} />
        <Route path="/vocabulary" element={<ComingSoonPage title="Vocabulary" />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/progress" element={<ProgressPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
