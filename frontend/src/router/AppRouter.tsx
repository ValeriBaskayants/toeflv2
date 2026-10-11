import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage/Loginpage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage/Authcallbackpage';
import { DashboardPage } from '@/pages/DashboardPage/DashboardPage';
import { AppShell } from '@/components/layout/AppShell/AppShell';
import { ExamShell } from '@/components/layout/ExamShell/ExamShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute/Protectedroute';
import AdminPage from '@/pages/Adminpage/Adminpage';
import ProgressPage from '@/pages/ProgressPage/ProgressPage';
import ReadingListPage from '@/pages/ReadingListPage/ReadingListPage';
import ReadingReaderPage from '@/pages/ReadingReaderPage/ReadingReaderPage';
import { GrammarRulesPage } from '@/pages/GrammarRulesPage/GrammarRulesPage';
import { GrammarRulePage } from '@/pages/GrammarRulePage/GrammarRulePage';
import { PlacementPage } from '@/pages/Placementpage/Placementpage';
import ListeningPage from '@/pages/ListeningPage/ListeningPage';
import ListeningTaskPage from '@/pages/ListeningTaskPage/ListeningTaskPage';
import ListeningSessionPage from '@/pages/ListeningSessionPage/ListeningSessionPage';
import ListeningResultPage from '@/pages/ListeningResultPage/ListeningResultPage';
import QuizPage from '@/pages/Quizpage/Quizpage';
import { BookmarksPage } from '@/pages/Bookmarkspage/Bookmarkspage';
import WritingPage from '@/pages/WritingPage/WritingPage';
import WritingTypeHubPage from '@/pages/WritingTypeHubPage/WritingTypeHubPage';
import WritingSessionPage from '@/pages/WritingSessionPage/WritingSessionPage';
import WritingResultPage from '@/pages/WritingResultPage/WritingResultPage';
import ScrambleHubPage from '@/pages/ScrambleListPage/ScrambleListPage';
import ScrambleSessionPage from '@/pages/ScrambleSessionPage/ScrambleSessionPage';
import ScrambleBlockSessionPage from '@/pages/ScrambleBlockSessionPage/ScrambleBlockSessionPage';
import ScrambleResultPage from '@/pages/ScrambleResultPage/ScrambleResultPage';
import MistakesPage from '@/pages/MistakePage/MistakesPage';
import { VocabularyPage } from '@/pages/VocabularyPage/VocabularyPage';
import { ExercisesPage } from '@/pages/ExercisesPage/ExercisesPage';
import { ExerciseList } from '@/pages/ExerciseList/ExerciseList';
import SpeakingRepeatPlayerPage from '@/pages/SpeakingRepeatPlayerPage/SpeakingRepeatPlayerPage';
import SpeakingListPage from '@/pages/SpeakingListPage/SpeakingListPage';
import { WritingType } from '@/types/globalTypes';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Полноэкранное прохождение — без сайдбара, как на реальном TOEFL */}
      <Route element={<ProtectedRoute><ExamShell /></ProtectedRoute>}>
        <Route path="/writing/scramble/session/:blockId" element={<ScrambleSessionPage />} />
        <Route path="/writing/scramble/block/:blockId" element={<ScrambleBlockSessionPage />} />
        <Route path="/writing/session/:sessionId" element={<WritingSessionPage />} />
        <Route path="/listening/session/:sessionId" element={<ListeningSessionPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/writing" element={<WritingPage />} />
        <Route path="/writing/scramble" element={<ScrambleHubPage />} />
        <Route path="/writing/scramble/result/:blockId" element={<ScrambleResultPage />} />
        <Route path="/writing/email" element={<WritingTypeHubPage type={WritingType.EMAIL} />} />
        <Route path="/writing/discussion" element={<WritingTypeHubPage type={WritingType.ACADEMIC_DISCUSSION} />} />
        <Route path="/writing/result/:submissionId" element={<WritingResultPage />} />

        <Route path="/reading" element={<ReadingListPage />} />
        <Route path="/reading/:slug" element={<ReadingReaderPage />} />

        <Route path="/listening" element={<ListeningPage />} />
        <Route path="/listening/result/:sessionId" element={<ListeningResultPage />} />
        <Route path="/listening/:taskSlug" element={<ListeningTaskPage />} />

        <Route path="/grammar" element={<GrammarRulesPage />} />
        <Route path="/grammar/:slug" element={<GrammarRulePage />} />

        <Route path="/vocabulary" element={<VocabularyPage />} />

        <Route path="/exercises" element={<ExercisesPage />} />
        <Route path="/exercises/:topic" element={<ExerciseList />} />

        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/placement" element={<PlacementPage />} />
        <Route path="/mistakes" element={<MistakesPage />} />
        <Route path="/admin" element={<AdminPage />} />

        <Route path="/speaking" element={<SpeakingListPage />} />
        <Route path="/speaking/:id" element={<SpeakingRepeatPlayerPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}