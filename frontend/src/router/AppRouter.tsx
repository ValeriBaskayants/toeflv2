// frontend/src/router/AppRouter.tsx
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
import { GrammarRulePage } from '@/pages/GrammarRulePage/GrammarRulePage';
import { PlacementPage } from '@/pages/Placementpage/Placementpage';
import ListeningPage from '@/pages/ListeningPage/ListeningPage';
import ListeningPlayerPage from '@/pages/Listeningplayerpage/Listeningplayerpage';
import QuizPage from '@/pages/Quizpage/Quizpage';
import { BookmarksPage } from '@/pages/Bookmarkspage/Bookmarkspage';
import WritingEditorPage from '@/pages/Writingeditorpage/Writingeditorpage';
import WritingPage from '@/pages/WritingPage/WritingPage';
import WritingArticlesPage from '@/pages/WritingArticlesPage/WritingArticlesPage';
import ScrambleListPage from '@/pages/ScrambleListPage/ScrambleListPage';
import ScrambleSessionPage from '@/pages/ScramblePage/ScrambleSessionPage';
import MistakesPage from '@/pages/MistakePage/MistakesPage';
import { VocabularyPage } from '@/pages/VocabularyPage/VocabularyPage';
import { ExercisesPage } from '@/pages/ExercisesPage/ExercisesPage';
import { ExerciseList } from '@/pages/ExerciseList/ExerciseList';

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

        {/* Writing — хаб + два поджанра */}
        <Route path="/writing" element={<WritingPage />} />
        <Route path="/writing/articles" element={<WritingArticlesPage />} />
        <Route path="/writing/articles/:promptId" element={<WritingEditorPage />} />
        <Route path="/writing/scramble" element={<ScrambleListPage />} />
        <Route path="/writing/scramble/session" element={<ScrambleSessionPage />} />

        <Route path="/reading" element={<ReadingListPage />} />
        <Route path="/reading/:slug" element={<ReadingReaderPage />} />

        <Route path="/listening" element={<ListeningPage />} />
        <Route path="/listening/:id" element={<ListeningPlayerPage />} />

        <Route path="/grammar" element={<GrammarRulesPage />} />
        <Route path="/grammar/:slug" element={<GrammarRulePage />} />

        <Route path="/vocabulary" element={<VocabularyPage />} />
        <Route path="/speaking" element={<ComingSoonPage title="Speaking" />} />

        <Route path="/exercises" element={<ExercisesPage />} />
        <Route path="/exercises/:topic" element={<ExerciseList />} />

        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/placement" element={<PlacementPage />} />
        <Route path="/mistakes" element={<MistakesPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}