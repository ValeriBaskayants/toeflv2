import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, Layers, Headphones, AlignLeft,
  Trophy, AlertCircle, RefreshCw, ArrowLeft,
  CheckCircle, XCircle, ChevronRight, RotateCcw,
  Clock, TrendingUp,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  fetchPlacementStatus,
  startPlacementTest,
  answerPlacementQuestion,
  clearLastAnswerFeedback,
  clearPlacementError,
} from '@/store/Slices/PlacementSlice';
import { clearProgress } from '@/store/Slices/ProgressSlice';
import type { Dimension, DimensionResult } from '@/types/Placement/Placement.types';
import styles from './Placementpage.module.css';


const FEEDBACK_DURATION_MS = 800;
const OPTION_LABELS        = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

const DIMENSION_META: Record<Dimension, { color: string; Icon: React.ElementType }> = {
  GRAMMAR:    { color: '#14b8a6', Icon: AlignLeft },
  VOCABULARY: { color: '#8b5cf6', Icon: Layers },
  READING:    { color: '#22c55e', Icon: BookOpen },
  LISTENING:  { color: '#f59e0b', Icon: Headphones },
};

const LEVEL_DISPLAY: Record<string, string> = {
  A1: 'A1', A1_PLUS: 'A1+', A2: 'A2', A2_PLUS: 'A2+',
  B1: 'B1', B1_PLUS: 'B1+', B2: 'B2', B2_PLUS: 'B2+',
  C1: 'C1', C2: 'C2',
};

const LEVEL_COLOR: Record<string, string> = {
  A1: '#22c55e', A1_PLUS: '#16a34a', A2: '#14b8a6', A2_PLUS: '#0d9488',
  B1: '#3b82f6', B1_PLUS: '#2563eb', B2: '#6366f1', B2_PLUS: '#4f46e5',
  C1: '#8b5cf6', C2: '#a855f7',
};

type FeedbackState = 'idle' | 'correct' | 'incorrect';

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function ProgressHeader({
  answered,
  maxQuestions,
  dimension,
  progressHint,
}: {
  answered:      number;
  maxQuestions:  number;
  dimension:     Dimension;
  progressHint:  string | null;
}) {
  const { t } = useTranslation();
  const meta   = DIMENSION_META[dimension];
  const Icon   = meta.Icon;
  const pct    = Math.min(100, Math.round((answered / maxQuestions) * 100));

  return (
    <div className={styles['progressHeader']}>
      <div className={styles['progressTop']}>
        <div
          className={styles['dimensionBadge']}
          style={{ '--dim-color': meta.color } as React.CSSProperties}
        >
          <Icon size={13} />
          {t(`placement.${dimension.toLowerCase() as 'grammar' | 'vocabulary' | 'reading' | 'listening'}`)}
        </div>
        <span className={styles['questionCount']}>
          {answered + 1}
          <span className={styles['maxCount']}>&thinsp;/&thinsp;~{maxQuestions}</span>
        </span>
      </div>

      <div className={styles['progressTrack']}>
        <div className={styles['progressFill']} style={{ width: `${pct}%` }} />
      </div>

      {progressHint !== null && (
        <p className={styles['progressHint']}>{progressHint}</p>
      )}
    </div>
  );
}

function OptionButton({
  label, text, isSelected, feedback, disabled, onClick,
}: {
  label:      string;
  text:       string;
  isSelected: boolean;
  feedback:   FeedbackState;
  disabled:   boolean;
  onClick:    () => void;
}) {
  const isCorrect = isSelected && feedback === 'correct';
  const isWrong   = isSelected && feedback === 'incorrect';

  return (
    <button
      type="button"
      className={[
        styles['option'],
        isSelected ? styles['optionSelected'] : '',
        isCorrect  ? styles['optionCorrect']  : '',
        isWrong    ? styles['optionWrong']    : '',
      ].join(' ')}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isSelected}
    >
      <span className={styles['optionLabel']}>{label}</span>
      <span className={styles['optionText']}>{text}</span>
      {isCorrect && <CheckCircle size={18} className={styles['feedbackIcon']} />}
      {isWrong   && <XCircle    size={18} className={styles['feedbackIcon']} />}
    </button>
  );
}

function LoadingView({ label }: { label: string }) {
  return (
    <div className={styles['centeredView']}>
      <div className={styles['loadingSpinner']} />
      <p className={styles['loadingLabel']}>{label}</p>
    </div>
  );
}

function ErrorView({
  message, onRetry, onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack:  () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles['centeredView']}>
      <AlertCircle size={44} className={styles['errorIcon']} />
      <p className={styles['errorTitle']}>{t('placement.errorTitle')}</p>
      <p className={styles['errorMsg']}>{message}</p>
      <div className={styles['errorActions']}>
        <button type="button" className={styles['retryBtn']} onClick={onRetry}>
          <RefreshCw size={14} /> {t('placement.tryAgain')}
        </button>
        <button type="button" className={styles['backLinkBtn']} onClick={onBack}>
          {t('placement.backToDashboard')}
        </button>
      </div>
    </div>
  );
}

function SessionLostView({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <div className={styles['centeredView']}>
      <div className={styles['sessionLostIcon']}>⚠️</div>
      <p className={styles['errorTitle']}>{t('placement.sessionLostTitle')}</p>
      <p className={styles['errorMsg']}>{t('placement.sessionLostMsg')}</p>
      <button type="button" className={styles['retryBtn']} onClick={onBack}>
        <ArrowLeft size={14} /> {t('placement.backToDashboard')}
      </button>
    </div>
  );
}

// Dimension breakdown — детали по каждому измерению
function DimensionBreakdown({ breakdown }: { breakdown: DimensionResult[] }) {
  const { t } = useTranslation();

  const confidenceColor: Record<string, string> = {
    High:   '#22c55e',
    Medium: '#f59e0b',
    Low:    '#ef4444',
  };

  const dimensionColor: Record<string, string> = {
    Grammar:    '#14b8a6',
    Vocabulary: '#8b5cf6',
    Reading:    '#22c55e',
    Listening:  '#f59e0b',
  };

  return (
    <div className={styles['breakdownSection']}>
      <h3 className={styles['breakdownTitle']}>{t('placement.breakdownTitle')}</h3>
      <div className={styles['breakdownGrid']}>
        {breakdown.map((item) => (
          <div key={item.dimension} className={styles['breakdownCard']}>
            <div className={styles['breakdownHeader']}>
              <span
                className={styles['breakdownDimension']}
                style={{ color: dimensionColor[item.dimension] ?? '#6366f1' }}
              >
                {item.dimension}
              </span>
              <span
                className={styles['breakdownLevel']}
                style={{ color: dimensionColor[item.dimension] ?? '#6366f1' }}
              >
                {LEVEL_DISPLAY[item.level] ?? item.level}
              </span>
            </div>
            <div
              className={styles['breakdownConfidence']}
              style={{ color: confidenceColor[item.confidence] ?? '#94a3b8' }}
            >
              {t(`placement.confidence${item.confidence}`)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Страница результатов
function ResultsView({
  level,
  confidenceScore,
  questionsAnswered,
  testDurationSeconds,
  dimensionBreakdown,
  isRetake,
  previousLevel,
  onContinue,
  canRetake,
}: {
  level:               string;
  confidenceScore:     number;
  questionsAnswered:   number;
  testDurationSeconds: number | null;
  dimensionBreakdown:  DimensionResult[];
  isRetake:            boolean;
  previousLevel:       string | null;
  onContinue:          () => void;
  onRetake:            () => void;
  canRetake:           boolean;
}) {
  const { t }        = useTranslation();
  const displayLevel = LEVEL_DISPLAY[level] ?? level;
  const color        = LEVEL_COLOR[level]    ?? '#6366f1';
  const description  = t(`placement.levels.${level}`, { defaultValue: 'Your level has been set. Begin your journey!' });

  const minutes = testDurationSeconds !== null
    ? Math.max(1, Math.round(testDurationSeconds / 60))
    : null;

  // Показываем "улучшение" если retake и уровень изменился
  const showImprovement =
    isRetake &&
    previousLevel !== null &&
    previousLevel !== level &&
    LEVEL_DISPLAY[level] !== LEVEL_DISPLAY[previousLevel];

  return (
    <div className={styles['resultsView']}>
      <div className={styles['resultsInner']}>
        {/* Trophy */}
        <div className={styles['trophyWrap']}>
          <Trophy size={32} className={styles['trophyIcon']} />
        </div>

        {/* Retake badge */}
        {isRetake && (
          <span className={styles['retakeBadge']}>
            <RotateCcw size={12} />
            {t('placement.testCompleted')} #{2}
          </span>
        )}

        <p className={styles['resultsIntro']}>{t('placement.yourLevelIs')}</p>

        {/* Уровень */}
        <div
          className={styles['bigLevelBadge']}
          style={{
            background:   `${color}18`,
            borderColor:  `${color}33`,
            color,
          } as React.CSSProperties}
        >
          {displayLevel}
        </div>

        {/* Улучшение по сравнению с предыдущим */}
        {showImprovement && (
          <div className={styles['improvementBadge']}>
            <TrendingUp size={14} />
            {t('placement.improvedFrom', {
              from: LEVEL_DISPLAY[previousLevel ?? ''] ?? previousLevel,
              to:   displayLevel,
            })}
          </div>
        )}

        {/* Confidence bar */}
        <div className={styles['confidenceRow']}>
          <div className={styles['confidenceBar']}>
            <div
              className={styles['confidenceFill']}
              style={{ width: `${confidenceScore}%`, backgroundColor: color }}
            />
          </div>
          <span className={styles['confidenceLabel']}>
            {t('placement.confidencePct', { score: confidenceScore })}
          </span>
        </div>

        {/* Описание уровня */}
        <p className={styles['levelDescription']}>{description}</p>

        {/* Dimension breakdown */}
        {dimensionBreakdown.length > 0 && (
          <DimensionBreakdown breakdown={dimensionBreakdown} />
        )}

        {/* Статистика */}
        <div className={styles['statsRow']}>
          <span className={styles['statChip']}>
            {t('placement.answeredQuestions', { count: questionsAnswered })}
          </span>
          {minutes !== null && (
            <span className={styles['statChip']}>
              <Clock size={12} />
              {t('placement.testDuration', { minutes })}
            </span>
          )}
        </div>

        {/* CTA */}
        <button
          type="button"
          className={styles['continueBtn']}
          onClick={onContinue}
          style={{ background: `linear-gradient(135deg, ${color}, var(--accent))` }}
        >
          {t('placement.startLearning', { level: displayLevel })}
          <ChevronRight size={18} />
        </button>

        {/* Retake: тест завершён, но canRetake = false → показываем когда можно */}
        {!canRetake && (
          <p className={styles['retakeHint']}>
            {t('placement.retakeAvailable', { days: 30 })}
          </p>
        )}
      </div>
    </div>
  );
}

// Страница "уже завершён" — canRetake=true
function AlreadyCompletedView({
  detectedLevel,
  confidenceScore,
  canRetake,
  onRetake,
  onBack,
}: {
  detectedLevel:   string | null;
  confidenceScore: number | null;
  canRetake:       boolean;
  onRetake:        () => void;
  onBack:          () => void;
}) {
  const { t }   = useTranslation();
  const level   = detectedLevel ?? 'A1';
  const display = LEVEL_DISPLAY[level] ?? level;
  const color   = LEVEL_COLOR[level]   ?? '#6366f1';

  return (
    <div className={styles['centeredView']}>
      <div
        className={styles['bigLevelBadge']}
        style={{ background: `${color}18`, borderColor: `${color}33`, color }}
      >
        {display}
      </div>

      <p className={styles['errorTitle']}>{t('placement.alreadyCompleted')}</p>

      {confidenceScore !== null && (
        <div className={styles['confidenceRow']} style={{ width: '100%', maxWidth: 280 }}>
          <div className={styles['confidenceBar']}>
            <div
              className={styles['confidenceFill']}
              style={{ width: `${confidenceScore}%`, backgroundColor: color }}
            />
          </div>
          <span className={styles['confidenceLabel']}>
            {t('placement.confidencePct', { score: confidenceScore })}
          </span>
        </div>
      )}

      <div className={styles['errorActions']}>
        {canRetake ? (
          <button type="button" className={styles['retryBtn']} onClick={onRetake}>
            <RotateCcw size={14} /> {t('placement.retakeNow')}
          </button>
        ) : (
          <p className={styles['retakeHint']}>{t('placement.retakeAvailable', { days: 30 })}</p>
        )}

        <button type="button" className={styles['backLinkBtn']} onClick={onBack}>
          {t('placement.backToDashboard')}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export function PlacementPage() {
  const { t }    = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    status,
    statusLoaded,
    currentQuestion,
    questionsAnswered,
    maxQuestions,
    lastAnswerCorrect,
    isLoadingStatus,
    isStarting,
    isAnswering,
    error,
    detectedLevel,
    confidenceScore,
    dimensionBreakdown,
    testDurationSeconds,
    isRetake,
    canRetake,
    progressHint,
    questionShownAt,
  } = useAppSelector((s) => s.placement);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [feedback, setFeedback]       = useState<FeedbackState>('idle');
  const hasStartedRef                 = useRef(false);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      let resolvedStatus = status;

      if (!statusLoaded) {
        const result = await dispatch(fetchPlacementStatus());
        if (fetchPlacementStatus.fulfilled.match(result)) {
          resolvedStatus = result.payload.status;
        } else {
          return;
        }
      }

      // Автостарт только если PENDING и вопроса ещё нет
      if (!hasStartedRef.current && resolvedStatus === 'PENDING' && currentQuestion === null) {
        hasStartedRef.current = true;
        void dispatch(startPlacementTest());
      }
    };

    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Сброс при смене вопроса ───────────────────────────────────────────────
  useEffect(() => {
    setSelectedIdx(null);
    setFeedback('idle');
  }, [currentQuestion?.index]);

  // ── Feedback animation ────────────────────────────────────────────────────
  useEffect(() => {
    if (lastAnswerCorrect === null) return;

    setFeedback(lastAnswerCorrect ? 'correct' : 'incorrect');
    const timer = setTimeout(() => {
      setFeedback('idle');
      dispatch(clearLastAnswerFeedback());
    }, FEEDBACK_DURATION_MS);

    return () => { clearTimeout(timer); };
  }, [lastAnswerCorrect, dispatch]);

  const handleOptionClick = useCallback(
    (optionIndex: number) => {
      if (isAnswering || feedback !== 'idle' || currentQuestion === null) return;

      setSelectedIdx(optionIndex);
      const payload: { questionIndex: number; selectedIndex: number; questionStartAt?: string } = {
        questionIndex: currentQuestion.index,
        selectedIndex: optionIndex,
      };
      if (questionShownAt != null) payload.questionStartAt = questionShownAt;

      void dispatch(answerPlacementQuestion(payload));
    },
    [isAnswering, feedback, currentQuestion, dispatch, questionShownAt],
  );

  const handleRetry = useCallback(() => {
    dispatch(clearPlacementError());
    if (!statusLoaded) {
      void dispatch(fetchPlacementStatus());
    } else if (status === 'PENDING' && currentQuestion === null) {
      hasStartedRef.current = true;
      void dispatch(startPlacementTest());
    }
  }, [dispatch, statusLoaded, status, currentQuestion]);

  const handleRetake = useCallback(() => {
    hasStartedRef.current = true;
    void dispatch(startPlacementTest());
  }, [dispatch]);

  const handleContinue = useCallback(() => {
    dispatch(clearProgress());
    navigate('/dashboard', { replace: true });
  }, [dispatch, navigate]);

  const handleBack = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  // ── Render guards ──────────────────────────────────────────────────────────

  if (error !== null) {
    return (
      <div className={styles['page']}>
        <ErrorView message={error} onRetry={handleRetry} onBack={handleBack} />
      </div>
    );
  }

  if (isLoadingStatus || !statusLoaded || isStarting) {
    return (
      <div className={styles['page']}>
        <LoadingView
          label={isStarting ? t('placement.preparingQuestion') : t('placement.loading')}
        />
      </div>
    );
  }

  // COMPLETED — показываем результаты (после только что завершённого теста)
  if (status === 'COMPLETED' && detectedLevel !== null && dimensionBreakdown.length > 0) {
    return (
      <div className={styles['page']}>
        <ResultsView
          level={detectedLevel}
          confidenceScore={confidenceScore ?? 0}
          questionsAnswered={questionsAnswered}
          testDurationSeconds={testDurationSeconds}
          dimensionBreakdown={dimensionBreakdown}
          isRetake={isRetake}
          previousLevel={null}
          onContinue={handleContinue}
          onRetake={handleRetake}
          canRetake={canRetake}
        />
      </div>
    );
  }

  // COMPLETED — пользователь вернулся на страницу после завершения (нет breakdown в store)
  if (status === 'COMPLETED') {
    return (
      <div className={styles['page']}>
        <AlreadyCompletedView
          detectedLevel={detectedLevel}
          confidenceScore={confidenceScore}
          canRetake={canRetake}
          onRetake={handleRetake}
          onBack={handleBack}
        />
      </div>
    );
  }

  if (status === 'SKIPPED') {
    return (
      <div className={styles['page']}>
        <div className={styles['centeredView']}>
          <p className={styles['loadingLabel']}>{t('placement.redirecting')}</p>
        </div>
      </div>
    );
  }

  if (status === 'IN_PROGRESS' && currentQuestion === null && !isAnswering) {
    return (
      <div className={styles['page']}>
        <SessionLostView onBack={handleBack} />
      </div>
    );
  }

  if (currentQuestion === null) {
    return (
      <div className={styles['page']}>
        <LoadingView label={t('placement.loadingNext')} />
      </div>
    );
  }

  // ── Основной тест ──────────────────────────────────────────────────────────
  const meta                  = DIMENSION_META[currentQuestion.dimension as Dimension];
  const isInteractionDisabled = isAnswering || feedback !== 'idle';

  return (
    <div className={styles['page']}>
      <button
        type="button"
        className={styles['backBtn']}
        onClick={handleBack}
        disabled={isInteractionDisabled}
        aria-label={t('placement.backToDashboard')}
      >
        <ArrowLeft size={15} />
        {t('placement.backToDashboard')}
      </button>

      <div
        className={styles['testCard']}
        style={{ '--dim-accent': meta.color } as React.CSSProperties}
      >
        <div className={styles['cardAccent']} />

        <ProgressHeader
          answered={questionsAnswered}
          maxQuestions={maxQuestions}
          dimension={currentQuestion.dimension}
          progressHint={progressHint}
        />

        <div className={styles['questionSection']}>
          <p className={styles['questionText']} key={currentQuestion.index}>
            {currentQuestion.text}
          </p>
        </div>

        <div className={styles['optionsGrid']} key={`opts-${currentQuestion.index}`}>
          {currentQuestion.options.map((option:string, idx:number) => (
            <OptionButton
              key={idx}
              label={OPTION_LABELS[idx] ?? String(idx + 1)}
              text={option}
              isSelected={selectedIdx === idx}
              feedback={feedback}
              disabled={isInteractionDisabled}
              onClick={() => { handleOptionClick(idx); }}
            />
          ))}
        </div>

        <p className={styles['hintText']}>
          {isAnswering
            ? t('placement.checkingAnswer')
            : t('placement.selectAnswer')}
        </p>
      </div>
    </div>
  );
}