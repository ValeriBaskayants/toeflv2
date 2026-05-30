import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Layers,
  Headphones,
  AlignLeft,
  Trophy,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  XCircle,
  ChevronRight,
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

import styles from './Placementpage.module.css';
import type { Dimension } from '@/types/Placement/Placement.types';

const FEEDBACK_DURATION_MS = 750;

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

const DIMENSION_META: Record<Dimension, { label: string; color: string; Icon: React.ElementType }> =
  {
    GRAMMAR: { label: 'Grammar', color: '#14b8a6', Icon: AlignLeft },
    VOCABULARY: { label: 'Vocabulary', color: '#8b5cf6', Icon: Layers },
    READING: { label: 'Reading', color: '#22c55e', Icon: BookOpen },
    LISTENING: { label: 'Listening', color: '#f59e0b', Icon: Headphones },
  };

const LEVEL_DISPLAY: Record<string, string> = {
  A1: 'A1',
  A1_PLUS: 'A1+',
  A2: 'A2',
  A2_PLUS: 'A2+',
  B1: 'B1',
  B1_PLUS: 'B1+',
  B2: 'B2',
  B2_PLUS: 'B2+',
  C1: 'C1',
  C2: 'C2',
};

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  A1: "Beginner — you're just starting out. We'll build the foundation step by step.",
  A1_PLUS: "Elementary — you know the basics. Let's strengthen and expand from here.",
  A2: 'Pre-intermediate — you can handle everyday language. Time to level up.',
  A2_PLUS: "Transitional — you're ready to tackle structured topics with confidence.",
  B1: 'Intermediate — solid practical English. TOEFL is within reach.',
  B1_PLUS: "Upper-intermediate — strong skills across all areas. Let's fine-tune.",
  B2: 'Upper-intermediate — fluent in most contexts. The TOEFL target zone.',
  B2_PLUS: 'Advanced — near-native range. Focus on precision and academic style.',
  C1: 'Advanced — exceptional command. Polish your academic English to the max.',
  C2: "Mastery — near-native proficiency. You're ready to ace the TOEFL.",
};

const LEVEL_COLOR: Record<string, string> = {
  A1: '#22c55e',
  A1_PLUS: '#16a34a',
  A2: '#14b8a6',
  A2_PLUS: '#0d9488',
  B1: '#3b82f6',
  B1_PLUS: '#2563eb',
  B2: '#6366f1',
  B2_PLUS: '#4f46e5',
  C1: '#8b5cf6',
  C2: '#a855f7',
};

type FeedbackState = 'idle' | 'correct' | 'incorrect';

function ProgressHeader({
  answered,
  maxQuestions,
  dimension,
}: {
  answered: number;
  maxQuestions: number;
  dimension: Dimension;
}) {
  const meta = DIMENSION_META[dimension];
  const Icon = meta.Icon;
  const pct = Math.min(100, Math.round((answered / maxQuestions) * 100));

  return (
    <div className={styles['progressHeader']}>
      <div className={styles['progressTop']}>
        <div
          className={styles['dimensionBadge']}
          style={{ '--dim-color': meta.color } as React.CSSProperties}
        >
          <Icon size={13} />
          {meta.label}
        </div>
        <span className={styles['questionCount']}>
          {answered + 1} <span className={styles['maxCount']}>/ ~{maxQuestions}</span>
        </span>
      </div>
      <div className={styles['progressTrack']}>
        <div className={styles['progressFill']} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function OptionButton({
  label,
  text,
  isSelected,
  feedback,
  disabled,
  onClick,
}: {
  label: string;
  text: string;
  isSelected: boolean;
  feedback: FeedbackState;
  disabled: boolean;
  onClick: () => void;
}) {
  const isCorrectFeedback = isSelected && feedback === 'correct';
  const isWrongFeedback = isSelected && feedback === 'incorrect';

  return (
    <button
      type="button"
      className={`
        ${styles['option']}
        ${isSelected ? styles['optionSelected'] : ''}
        ${isCorrectFeedback ? styles['optionCorrect'] : ''}
        ${isWrongFeedback ? styles['optionWrong'] : ''}
      `}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isSelected}
    >
      <span className={styles['optionLabel']}>{label}</span>
      <span className={styles['optionText']}>{text}</span>
      {isCorrectFeedback && <CheckCircle size={18} className={styles['feedbackIcon']} />}
      {isWrongFeedback && <XCircle size={18} className={styles['feedbackIcon']} />}
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
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className={styles['centeredView']}>
      <AlertCircle size={44} className={styles['errorIcon']} />
      <p className={styles['errorTitle']}>Something went wrong</p>
      <p className={styles['errorMsg']}>{message}</p>
      <div className={styles['errorActions']}>
        <button type="button" className={styles['retryBtn']} onClick={onRetry}>
          <RefreshCw size={14} /> Try again
        </button>
        <button type="button" className={styles['backLinkBtn']} onClick={onBack}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

function SessionLostView({ onBack }: { onBack: () => void }) {
  return (
    <div className={styles['centeredView']}>
      <div className={styles['sessionLostIcon']}>⚠️</div>
      <p className={styles['errorTitle']}>Session interrupted</p>
      <p className={styles['errorMsg']}>
        Your test session was lost when the page was refreshed. Please return to the Dashboard — the
        test can be restarted from your profile settings.
      </p>
      <button type="button" className={styles['retryBtn']} onClick={onBack}>
        <ArrowLeft size={14} /> Back to Dashboard
      </button>
    </div>
  );
}

function ResultsView({
  level,
  confidenceScore,
  questionsAnswered,
  onContinue,
}: {
  level: string;
  confidenceScore: number;
  questionsAnswered: number;
  onContinue: () => void;
}) {
  const displayLevel = LEVEL_DISPLAY[level] ?? level;
  const color = LEVEL_COLOR[level] ?? '#6366f1';
  const description = LEVEL_DESCRIPTIONS[level] ?? 'Your level has been set. Begin your journey!';

  return (
    <div className={styles['resultsView']}>
      <div className={styles['resultsInner']}>
        {/* Trophy */}
        <div className={styles['trophyWrap']}>
          <Trophy size={32} className={styles['trophyIcon']} />
        </div>

        <p className={styles['resultsIntro']}>Your English level is</p>

        {/* Big level badge */}
        <div
          className={styles['bigLevelBadge']}
          style={
            {
              '--level-color': color,
              background: `${color}18`,
              borderColor: `${color}33`,
              color,
            } as React.CSSProperties
          }
        >
          {displayLevel}
        </div>

        {/* Confidence */}
        <div className={styles['confidenceRow']}>
          <div className={styles['confidenceBar']}>
            <div
              className={styles['confidenceFill']}
              style={{ width: `${confidenceScore}%`, backgroundColor: color }}
            />
          </div>
          <span className={styles['confidenceLabel']}>{confidenceScore}% confidence</span>
        </div>

        {/* Description */}
        <p className={styles['levelDescription']}>{description}</p>

        {/* Stats */}
        <p className={styles['resultsStat']}>Answered {questionsAnswered} adaptive questions</p>

        {/* CTA */}
        <button
          type="button"
          className={styles['continueBtn']}
          onClick={onContinue}
          style={{ background: `linear-gradient(135deg, ${color}, var(--accent))` }}
        >
          Start learning at {displayLevel}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

export function PlacementPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    status,
    statusLoaded,
    showBanner: _showBanner,
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
  } = useAppSelector((state) => state.placement);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>('idle');

  const hasStartedRef = useRef(false);

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

      if (!hasStartedRef.current && resolvedStatus === 'PENDING' && currentQuestion === null) {
        hasStartedRef.current = true;
        void dispatch(startPlacementTest());
      }
    };

    void init();
  }, []);

  useEffect(() => {
    setSelectedIdx(null);
    setFeedback('idle');
  }, [currentQuestion?.index]);

  useEffect(() => {
    if (lastAnswerCorrect === null) {
      return;
    }

    setFeedback(lastAnswerCorrect ? 'correct' : 'incorrect');

    const timer = setTimeout(() => {
      setFeedback('idle');
      dispatch(clearLastAnswerFeedback());
    }, FEEDBACK_DURATION_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [lastAnswerCorrect, dispatch]);

  const handleOptionClick = useCallback(
    (optionIndex: number) => {
      if (isAnswering || feedback !== 'idle' || currentQuestion === null) {
        return;
      }

      setSelectedIdx(optionIndex);
      void dispatch(
        answerPlacementQuestion({
          questionIndex: currentQuestion.index,
          selectedIndex: optionIndex,
        }),
      );
    },
    [isAnswering, feedback, currentQuestion, dispatch],
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

  const handleContinueToDashboard = useCallback(() => {
    dispatch(clearProgress());
    navigate('/dashboard', { replace: true });
  }, [dispatch, navigate]);

  const handleBack = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

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
        <LoadingView label={isStarting ? 'Preparing your first question…' : 'Loading…'} />
      </div>
    );
  }

  if (status === 'COMPLETED' && detectedLevel !== null) {
    return (
      <div className={styles['page']}>
        <ResultsView
          level={detectedLevel}
          confidenceScore={confidenceScore ?? 0}
          questionsAnswered={questionsAnswered}
          onContinue={handleContinueToDashboard}
        />
      </div>
    );
  }

  if (status === 'SKIPPED') {
    return (
      <div className={styles['page']}>
        <div className={styles['centeredView']}>
          <p className={styles['loadingLabel']}>Redirecting…</p>
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
        <LoadingView label="Loading next question…" />
      </div>
    );
  }

  const meta = DIMENSION_META[currentQuestion.dimension];
  const isInteractionDisabled = isAnswering || feedback !== 'idle';

  return (
    <div className={styles['page']}>
      <button
        type="button"
        className={styles['backBtn']}
        onClick={handleBack}
        disabled={isInteractionDisabled}
      >
        <ArrowLeft size={15} />
        Dashboard
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
        />

        <div className={styles['questionSection']}>
          <p className={styles['questionText']} key={currentQuestion.index}>
            {currentQuestion.text}
          </p>
        </div>

        <div className={styles['optionsGrid']} key={`opts-${currentQuestion.index}`}>
          {currentQuestion.options.map((option, idx) => (
            <OptionButton
              key={idx}
              label={OPTION_LABELS[idx] ?? String(idx + 1)}
              text={option}
              isSelected={selectedIdx === idx}
              feedback={feedback}
              disabled={isInteractionDisabled}
              onClick={() => {
                handleOptionClick(idx);
              }}
            />
          ))}
        </div>

        <p className={styles['hintText']}>
          {isAnswering ? 'Checking your answer…' : 'Select the best answer — click to submit'}
        </p>
      </div>
    </div>
  );
}
