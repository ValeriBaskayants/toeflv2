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
import { GrammarRulesPage } from '@/pages/GrammarRulesPage/GrammarRulesPage';
import { PlacementPage } from '@/pages/Placementpage/Placementpage';
import ListeningPage from '@/pages/ListeningPage/ListeningPage';
import ListeningPlayerPage from '@/pages/Listeningplayerpage/Listeningplayerpage';
import QuizPage from '@/pages/Quizpage/Quizpage';
import { BookmarksPage } from '@/pages/Bookmarkspage/Bookmarkspage';
import WritingEditorPage from '@/pages/Writingeditorpage/Writingeditorpage';
import WritingPage from '@/pages/Writingpage/Writingpage';
import MistakesPage from '@/pages/MistakePage/MistakesPage';
import { VocabularyPage } from '@/pages/VocabularyPage/VocabularyPage';

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

        <Route path="/writing" element={<WritingPage />} />
        <Route path="/writing/:promptId" element={<WritingEditorPage />} />

        <Route path="/reading" element={<ReadingListPage />} />
        <Route path="/reading/:slug" element={<ReadingReaderPage />} />

        <Route path="/listening" element={<ListeningPage />} />
        <Route path="/listening/:id" element={<ListeningPlayerPage />} />

        <Route path="/grammar" element={<GrammarRulesPage />} />
        <Route path="/grammar-rules" element={<GrammarRulesPage />} />
        <Route path="/grammar-rules/:slug" element={<GrammarRulesPage />} />

        <Route path="/vocabulary" element={<VocabularyPage/>} />

        <Route path="/speaking" element={<ComingSoonPage title="Speaking" />} />

        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/placement" element={<PlacementPage />} />
        <Route path="/mistakes" element={<MistakesPage />} />

        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* ── Fallbacks ───────────────────────────────────────────────────── */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}