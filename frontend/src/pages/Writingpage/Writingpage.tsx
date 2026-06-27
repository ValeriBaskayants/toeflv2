import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PenLine,
  BookOpen,
  FileText,
  AlignLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Clock,
  BarChart2,
  Zap,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  fetchPrompts,
  fetchSubmissions,
  fetchUserStats,
  setFilter,
  clearEditor,
} from '@/store/Slices/WritingSlice';
import type { WritingPromptWithStatus } from '@/types/writing/Writing.types';
import type { SubmissionWithPrompt } from '@/api/services/writing';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './WritingPage.module.css';



const LEVELS = ['A1', 'A1_PLUS', 'A2', 'A2_PLUS', 'B1', 'B1_PLUS', 'B2', 'B2_PLUS', 'C1', 'C2'];
const LEVEL_DISPLAY: Record<string, string> = {
  A1: 'A1', A1_PLUS: 'A1+', A2: 'A2', A2_PLUS: 'A2+',
  B1: 'B1', B1_PLUS: 'B1+', B2: 'B2', B2_PLUS: 'B2+',
  C1: 'C1', C2: 'C2',
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  SENTENCE: <AlignLeft size={16} />,
  PARAGRAPH: <FileText size={16} />,
  ESSAY: <BookOpen size={16} />,
};

const TYPE_COLOR: Record<string, string> = {
  SENTENCE: '#14b8a6',
  PARAGRAPH: '#6366f1',
  ESSAY: '#ec4899',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function scoreColor(score: number): string {
  return score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
}



function StatsBar() {
  const { t } = useTranslation();
  const { userStats } = useAppSelector((s) => s.writing);

  if (userStats === null || userStats.totalSubmissions === 0) return null;

  const TrendIcon =
    userStats.recentTrend === 'improving' ? TrendingUp :
    userStats.recentTrend === 'declining' ? TrendingDown : Minus;

  const trendColor =
    userStats.recentTrend === 'improving' ? '#22c55e' :
    userStats.recentTrend === 'declining' ? '#ef4444' : 'var(--text-3)';

  return (
    <div className={styles['statsBar']}>
      <div className={styles['statItem']}>
        <span className={styles['statVal']}>{userStats.totalSubmissions}</span>
        <span className={styles['statLabel']}>{t('writing.stats.total')}</span>
      </div>
      {userStats.avgScore !== null && (
        <div className={styles['statItem']}>
          <span className={styles['statVal']} style={{ color: scoreColor(userStats.avgScore) }}>
            {Math.round(userStats.avgScore)}%
          </span>
          <span className={styles['statLabel']}>{t('writing.stats.avgScore')}</span>
        </div>
      )}
      {userStats.bestScore !== null && (
        <div className={styles['statItem']}>
          <Star size={13} style={{ color: '#f59e0b' }} />
          <span className={styles['statVal']} style={{ color: '#f59e0b' }}>
            {Math.round(userStats.bestScore)}%
          </span>
          <span className={styles['statLabel']}>{t('writing.stats.bestScore')}</span>
        </div>
      )}
      {userStats.recentTrend !== null && (
        <div className={styles['statItem']} style={{ color: trendColor }}>
          <TrendIcon size={15} />
          <span className={styles['statLabel']} style={{ color: trendColor }}>
            {t(`writing.stats.trend.${userStats.recentTrend}`)}
          </span>
        </div>
      )}
    </div>
  );
}



function PromptCard({ prompt }: { prompt: WritingPromptWithStatus }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const color = TYPE_COLOR[prompt.type] ?? '#6366f1';

  const handleClick = () => {
    dispatch(clearEditor());
    navigate(`/writing/${prompt.id}`);
  };

  const isCompleted = prompt.userStatus === 'completed';
  const isInProgress = prompt.userStatus === 'in_progress';

  return (
    <article
      className={`${styles['promptCard']} ${isCompleted ? styles['promptCardDone'] : ''}`}
      style={{ '--card-color': color } as React.CSSProperties}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
    >
      <div className={styles['promptCardHeader']}>
        <div className={styles['promptCardBadges']}>
          <span className={styles['levelBadge']}>
            {LEVEL_DISPLAY[prompt.level] ?? prompt.level}
          </span>
          <span
            className={styles['typeBadge']}
            style={{ '--type-color': color } as React.CSSProperties}
          >
            {TYPE_ICON[prompt.type]}
            {prompt.type.charAt(0) + prompt.type.slice(1).toLowerCase()}
          </span>
          {prompt.topic && <span className={styles['topicTag']}>#{prompt.topic}</span>}
        </div>

        <div className={styles['promptCardStatus']}>
          {isCompleted && (
            <span className={styles['statusDone']}>
              <CheckCircle2 size={12} />
              {prompt.userBestScore !== null ? `${Math.round(prompt.userBestScore)}%` : t('writing.status.completed')}
            </span>
          )}
          {isInProgress && (
            <span className={styles['statusInProgress']}>
              <Clock size={12} />
              {prompt.userBestScore !== null ? `${Math.round(prompt.userBestScore)}%` : t('writing.status.inProgress')}
            </span>
          )}
          {prompt.userAttemptCount > 0 && (
            <span className={styles['attemptCount']}>
              ×{prompt.userAttemptCount}
            </span>
          )}
        </div>
      </div>

      <p className={styles['promptText']}>{prompt.prompt}</p>

      <div className={styles['promptCardFooter']}>
        <span className={styles['wordRange']}>
          <BarChart2 size={12} />
          {prompt.minWords}–{prompt.maxWords} {t('writing.words')}
        </span>
        {prompt.instructions && (
          <span className={styles['hasInstructions']}>{t('writing.hasInstructions')}</span>
        )}
        <ChevronRight size={15} className={styles['cardArrow']} />
      </div>
    </article>
  );
}



function SubmissionCard({ sub }: { sub: SubmissionWithPrompt }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const score = sub.analysis?.overallScore;
  const isOk = sub.status === 'ANALYZED';
  const isErr = sub.status === 'ERROR';

  return (
    <article
      className={styles['submissionCard']}
      onClick={() => navigate(`/writing/${sub.promptId}?submission=${sub.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/writing/${sub.promptId}?submission=${sub.id}`);
      }}
    >
      <div className={styles['subTop']}>
        <span className={styles['subDate']}>
          <Clock size={11} />
          {formatDate(sub.submittedAt)}
        </span>
        {isOk && score !== undefined && (
          <span className={styles['subScore']} style={{ color: scoreColor(score) }}>
            <Zap size={11} />
            {Math.round(score)}%
          </span>
        )}
        {isErr && (
          <span className={styles['subError']}>
            <XCircle size={11} /> {t('writing.submissionError')}
          </span>
        )}
        {sub.status === 'PENDING' && (
          <span className={styles['subPending']}>{t('writing.analyzing')}</span>
        )}
      </div>
      <p className={styles['subPromptSnippet']}>{sub.prompt.prompt.slice(0, 80)}…</p>
      <p className={styles['subTextSnippet']}>{sub.text.slice(0, 100)}…</p>
    </article>
  );
}

export default function WritingPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { prompts, promptsLoading, promptsError, submissions, filters } = useAppSelector(
    (s) => s.writing,
  );

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters.level) params['level'] = filters.level;
    void dispatch(fetchPrompts(Object.keys(params).length > 0 ? params : undefined));
  }, [dispatch, filters.level]);

  useEffect(() => {
    void dispatch(fetchSubmissions(undefined));
    void dispatch(fetchUserStats());
  }, [dispatch]);

  const handleRetry = useCallback(() => {
    void dispatch(fetchPrompts());
  }, [dispatch]);

  if (promptsLoading && prompts.length === 0) {
    return <FullPageSpinner label={t('writing.loading')} />;
  }

  const filteredPrompts = filters.type
    ? prompts.filter((p) => p.type === filters.type)
    : prompts;

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <div>
          <h1 className={styles['pageTitle']}>
            <PenLine size={22} className={styles['pageTitleIcon']} />
            {t('writing.title')}
          </h1>
          <p className={styles['pageSubtitle']}>{t('writing.subtitle')}</p>
        </div>
        {prompts.length > 0 && (
          <span className={styles['countBadge']}>
            {filteredPrompts.length} {t('writing.promptsCount')}
          </span>
        )}
      </header>

      <StatsBar />

      <div className={styles['filterBar']}>
        <div className={styles['filterRow']}>
          <span className={styles['filterLabel']}>{t('writing.filters.level')}</span>
          <div className={styles['chips']}>
            <button
              type="button"
              className={`${styles['chip']} ${filters.level === null ? styles['chipActive'] : ''}`}
              onClick={() => dispatch(setFilter({ key: 'level', value: null }))}
            >
              {t('writing.filters.allLevels')}
            </button>
            {LEVELS.map((lv) => (
              <button
                key={lv}
                type="button"
                className={`${styles['chip']} ${filters.level === lv ? styles['chipActive'] : ''}`}
                onClick={() =>
                  dispatch(setFilter({ key: 'level', value: filters.level === lv ? null : lv }))
                }
              >
                {LEVEL_DISPLAY[lv]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles['filterRow']}>
          <span className={styles['filterLabel']}>{t('writing.filters.type')}</span>
          <div className={styles['typeTabs']}>
            {[null, 'SENTENCE', 'PARAGRAPH', 'ESSAY'].map((tp) => (
              <button
                key={String(tp)}
                type="button"
                className={`${styles['typeTab']} ${filters.type === tp ? styles['typeTabActive'] : ''}`}
                style={
                  tp !== null && filters.type === tp
                    ? ({ '--tab-color': TYPE_COLOR[tp] } as React.CSSProperties)
                    : undefined
                }
                onClick={() => dispatch(setFilter({ key: 'type', value: tp }))}
              >
                {tp === null
                  ? t('writing.filters.allTypes')
                  : tp.charAt(0) + tp.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {promptsError !== null && (
        <div className={styles['errorBanner']}>
          <AlertCircle size={15} />
          <span>{t('writing.error')}</span>
          <button type="button" className={styles['retryBtn']} onClick={handleRetry}>
            <RefreshCw size={13} /> {t('writing.retry')}
          </button>
        </div>
      )}

      {!promptsLoading && promptsError === null && filteredPrompts.length === 0 && (
        <div className={styles['emptyState']}>
          <PenLine size={52} className={styles['emptyIcon']} />
          <p className={styles['emptyTitle']}>{t('writing.empty.title')}</p>
          <p className={styles['emptyHint']}>{t('writing.empty.hint')}</p>
        </div>
      )}

      {filteredPrompts.length > 0 && (
        <section className={styles['promptsSection']}>
          <div className={styles['promptsGrid']}>
            {filteredPrompts.map((p) => (
              <PromptCard key={p.id} prompt={p} />
            ))}
          </div>
        </section>
      )}

      {submissions.length > 0 && (
        <section className={styles['historySection']}>
          <h2 className={styles['sectionTitle']}>
            <CheckCircle2 size={16} />
            {t('writing.history.title')}
          </h2>
          <div className={styles['submissionsGrid']}>
            {submissions.slice(0, 6).map((sub) => (
              <SubmissionCard key={sub.id} sub={sub} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}