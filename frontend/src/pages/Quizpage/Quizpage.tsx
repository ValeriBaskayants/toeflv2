import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCheck, ChevronLeft, ChevronRight, X, Zap,
  CheckCircle2, XCircle, RefreshCw, Loader2, AlertCircle,
  Target, Lightbulb, Trophy,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  loadQuizQuestions,
  submitQuiz,
  updateSetup,
  selectAnswer,
  goToQuestion,
  nextQuestion,
  prevQuestion,
  exitQuiz,
  type QuizSetup,
} from '@/store/Slices/QuizSlice';
import styles from './QuizPage.module.css';
import { Level, Difficulty } from '@/types/globalTypes';




const LEVELS: Level[] = [
  Level.A1, Level.A1_PLUS, Level.A2, Level.A2_PLUS,
  Level.B1, Level.B1_PLUS, Level.B2, Level.B2_PLUS,
  Level.C1, Level.C2
];

const LEVEL_DISPLAY: Record<Level, string> = {
  [Level.A1]: 'A1', [Level.A1_PLUS]: 'A1+', [Level.A2]: 'A2', [Level.A2_PLUS]: 'A2+',
  [Level.B1]: 'B1', [Level.B1_PLUS]: 'B1+', [Level.B2]: 'B2', [Level.B2_PLUS]: 'B2+',
  [Level.C1]: 'C1', [Level.C2]: 'C2',
};

const LEVEL_COLOR: Record<Level, string> = {
  [Level.A1]: '#22c55e', [Level.A1_PLUS]: '#16a34a', [Level.A2]: '#14b8a6', [Level.A2_PLUS]: '#0d9488',
  [Level.B1]: '#3b82f6', [Level.B1_PLUS]: '#2563eb', [Level.B2]: '#8b5cf6', [Level.B2_PLUS]: '#7c3aed',
  [Level.C1]: '#f59e0b', [Level.C2]: '#ef4444',
};

const RECOMMENDED_DIFFICULTY: Record<Level, Difficulty> = {
  [Level.A1]: Difficulty.EASY,
  [Level.A1_PLUS]: Difficulty.EASY,
  [Level.A2]: Difficulty.EASY,
  [Level.A2_PLUS]: Difficulty.MEDIUM,
  [Level.B1]: Difficulty.MEDIUM,
  [Level.B1_PLUS]: Difficulty.MEDIUM,
  [Level.B2]: Difficulty.MEDIUM,
  [Level.B2_PLUS]: Difficulty.HARD,
  [Level.C1]: Difficulty.HARD,
  [Level.C2]: Difficulty.HARD,
};

const DIFFICULTIES: Difficulty[] = [
  Difficulty.EASY,
  Difficulty.MEDIUM,
  Difficulty.HARD
];


const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  [Difficulty.EASY]: '#22c55e',
  [Difficulty.MEDIUM]: '#f59e0b',
  [Difficulty.HARD]: '#ef4444',
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  [Difficulty.EASY]: 'Easy',
  [Difficulty.MEDIUM]: 'Medium',
  [Difficulty.HARD]: 'Hard',
};

const COUNTS = [5, 10, 20, 30];
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function getLevelColor(level: Level): string {
  return LEVEL_COLOR[level] ?? '#6366f1';
}



function SetupPhase() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const topicId = useId();

  const { setup, loadStatus, loadError } = useAppSelector((state) => state.quiz);

  
  const currentLevel = setup.level as Level;
  const recommended = RECOMMENDED_DIFFICULTY[currentLevel] ?? Difficulty.MEDIUM;
  const isLoading = loadStatus === 'loading';

  const handleStart = useCallback(() => {
    void dispatch(loadQuizQuestions(setup));
  }, [dispatch, setup]);

  const patch = useCallback((partial: Partial<QuizSetup>) => {
    dispatch(updateSetup(partial));
  }, [dispatch]);

  return (
    <div className={styles['setupPage']}>
      <div className={styles['setupCard']}>

        {/* Header */}
        <div className={styles['setupHeader']}>
          <div className={styles['setupIcon']}>
            <CheckCheck size={22} />
          </div>
          <div>
            <h1 className={styles['setupTitle']}>
              {t('grammar.title', 'Grammar Quiz')}
            </h1>
            <p className={styles['setupSubtitle']}>
              {t('grammar.subtitle', 'Test your knowledge, earn XP, track mistakes')}
            </p>
          </div>
        </div>

        {/* Level picker */}
        <div className={styles['setupSection']}>
          <label className={styles['setupLabel']}>
            {t('grammar.level', 'Your level')}
          </label>
          <div className={styles['levelGrid']}>
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`${styles['levelBtn']} ${currentLevel === lvl ? styles['levelBtnActive'] : ''}`}
                style={{
                  '--lc': getLevelColor(lvl),
                  ...(currentLevel === lvl
                    ? { background: getLevelColor(lvl), borderColor: getLevelColor(lvl) }
                    : {}),
                } as React.CSSProperties}
                onClick={() => patch({ level: lvl })}
              >
                {LEVEL_DISPLAY[lvl]}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty picker */}
        <div className={styles['setupSection']}>
          <div className={styles['setupLabelRow']}>
            <label className={styles['setupLabel']}>
              {t('grammar.difficulty', 'Difficulty')}
            </label>
            <span className={styles['setupHint']}>
              <Lightbulb size={11} />
              {t('grammar.recommended', 'Recommended for')} {LEVEL_DISPLAY[currentLevel]}:{' '}
              <strong style={{ color: DIFFICULTY_COLOR[recommended] }}>
                {DIFFICULTY_LABEL[recommended]}
              </strong>
            </span>
          </div>

          <div className={styles['diffRow']}>
            {DIFFICULTIES.map((diff) => {
              const isRec = diff === recommended;
              const isActive = (setup.difficulty as Difficulty) === diff;
              return (
                <button
                  key={diff}
                  type="button"
                  className={`${styles['diffBtn']} ${isActive ? styles['diffBtnActive'] : ''} ${isRec ? styles['diffBtnRec'] : ''}`}
                  style={{
                    '--dc': DIFFICULTY_COLOR[diff],
                    ...(isActive
                      ? { background: DIFFICULTY_COLOR[diff], borderColor: DIFFICULTY_COLOR[diff] }
                      : {}),
                  } as React.CSSProperties}
                  onClick={() => patch({ difficulty: diff })}
                >
                  <span
                    className={styles['diffDot']}
                    style={{ background: isActive ? '#fff' : DIFFICULTY_COLOR[diff] }}
                  />
                  {DIFFICULTY_LABEL[diff]}
                  {isRec && !isActive && <span className={styles['recTag']}>rec</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question count */}
        <div className={styles['setupSection']}>
          <label className={styles['setupLabel']}>
            {t('grammar.questionCount', 'Number of questions')}
          </label>
          <div className={styles['countRow']}>
            {COUNTS.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles['countBtn']} ${setup.count === c ? styles['countBtnActive'] : ''}`}
                onClick={() => patch({ count: c })}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Topic (optional) */}
        <div className={styles['setupSection']}>
          <label className={styles['setupLabel']} htmlFor={topicId}>
            {t('grammar.topic', 'Topic')}
            <span className={styles['optionalTag']}>{t('grammar.optional', 'optional')}</span>
          </label>
          <input
            id={topicId}
            type="text"
            className={styles['topicInput']}
            value={setup.topic}
            onChange={(e) => patch({ topic: e.target.value })}
            placeholder={t('grammar.topicPlaceholder', 'e.g. Present Perfect, Modal Verbs…')}
          />
        </div>

        {/* Error */}
        {loadError !== null && (
          <div className={styles['setupError']}>
            <AlertCircle size={14} />
            <span>{loadError}</span>
          </div>
        )}

        {/* Start button */}
        <button
          type="button"
          className={styles['startBtn']}
          onClick={handleStart}
          disabled={isLoading}
        >
          {isLoading
            ? <Loader2 size={18} className={styles['spin']} />
            : <Target size={18} />
          }
          {isLoading
            ? t('grammar.loading', 'Loading questions…')
            : t('grammar.start', 'Start Quiz')}
        </button>
      </div>
    </div>
  );
}



function PlayingPhase() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const {
    setup,
    questions,
    currentIdx,
    answers,
    submitStatus,
    submitError,
  } = useAppSelector((state) => state.quiz);

  const currentLevel = setup.level as Level;
  const currentDiff = setup.difficulty as Difficulty;

  
  const question = questions[currentIdx] ?? null;
  const total = questions.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === total;
  const isSubmitting = submitStatus === 'loading';
  const selected = question !== null ? answers[question.id] : undefined;
  const levelColor = getLevelColor(currentLevel);
  const progress = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  const handleSelect = useCallback((index: number) => {
    if (question === null) { return; }
    dispatch(selectAnswer({ questionId: question.id, index }));
  }, [dispatch, question]);

  const handleSubmit = useCallback(() => {
    void dispatch(submitQuiz({
      answers,
      level: setup.level,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }));
  }, [dispatch, answers, setup.level]);

  if (question === null) { return null; }

  return (
    <div className={styles['playPage']}>

      {/* ── Top bar ── */}
      <div className={styles['playTopBar']}>
        <div className={styles['progressTrack']}>
          <div
            className={styles['progressFill']}
            style={{ width: `${progress}%`, background: levelColor }}
          />
        </div>

        <div className={styles['playMeta']}>
          <div className={styles['playMetaLeft']}>
            <span className={styles['levelChip']} style={{ background: levelColor }}>
              {LEVEL_DISPLAY[currentLevel] ?? setup.level}
            </span>
            <span className={styles['diffChip']} style={{ color: DIFFICULTY_COLOR[currentDiff] }}>
              {DIFFICULTY_LABEL[currentDiff]}
            </span>
          </div>

          <span className={styles['questionCounter']}>
            {currentIdx + 1} / {total}
          </span>

          <button
            type="button"
            className={styles['exitBtn']}
            onClick={() => dispatch(exitQuiz())}
            title={t('grammar.exit', 'Exit quiz')}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Dot navigation ── */}
      <div className={styles['dotNav']}>
        {questions.map((q, i) => {
          const isAnswered = answers[q.id] !== undefined;
          const isCurrent = i === currentIdx;
          return (
            <button
              key={q.id}
              type="button"
              className={`${styles['navDot']} ${isCurrent ? styles['navDotCurrent'] : ''} ${isAnswered && !isCurrent ? styles['navDotDone'] : ''}`}
              style={isCurrent ? { background: levelColor } : {}}
              onClick={() => dispatch(goToQuestion(i))}
              aria-label={`Question ${i + 1}`}
            />
          );
        })}
      </div>

      {/* ── Question card ── */}
      <div className={styles['questionWrap']}>
        <div className={styles['questionCard']}>
          {question.topic !== '' && (
            <span className={styles['qTopic']}>{question.topic}</span>
          )}

          <p className={styles['questionText']}>{question.question}</p>

          <div className={styles['optionList']} role="radiogroup">
            {question.options.map((opt: any, idx: number) => {
              const isSelected = selected === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`${styles['option']} ${isSelected ? styles['optionSelected'] : ''}`}
                  style={isSelected
                    ? { borderColor: levelColor, background: `${levelColor}14` }
                    : {}
                  }
                  onClick={() => handleSelect(idx)}
                >
                  <span
                    className={styles['optionLetter']}
                    style={isSelected ? { background: levelColor, color: '#fff' } : {}}
                  >
                    {OPTION_LETTERS[idx]}
                  </span>
                  <span className={styles['optionText']}>{opt}</span>
                  {isSelected && (
                    <span className={styles['optionCheck']} style={{ color: levelColor }}>
                      <CheckCircle2 size={16} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Nav row ── */}
      <div className={styles['navRow']}>
        <button
          type="button"
          className={styles['navBtn']}
          onClick={() => dispatch(prevQuestion())}
          disabled={currentIdx === 0}
        >
          <ChevronLeft size={18} />
          {t('grammar.prev', 'Previous')}
        </button>

        <div className={styles['navCenter']}>
          <span className={styles['answeredCount']}>
            {answeredCount} / {total} {t('grammar.answered', 'answered')}
          </span>
        </div>

        {currentIdx < total - 1 ? (
          <button
            type="button"
            className={styles['navBtn']}
            onClick={() => dispatch(nextQuestion())}
          >
            {t('grammar.next', 'Next')}
            <ChevronRight size={18} />
          </button>
        ) : (
          <button
            type="button"
            className={`${styles['submitBtn']} ${!allAnswered ? styles['submitBtnDisabled'] : ''}`}
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
            style={allAnswered ? { background: levelColor } : {}}
          >
            {isSubmitting
              ? <Loader2 size={16} className={styles['spin']} />
              : <CheckCircle2 size={16} />
            }
            {isSubmitting
              ? t('grammar.submitting', 'Submitting…')
              : t('grammar.submit', 'Submit Quiz')}
          </button>
        )}
      </div>

      {submitError !== null && (
        <div className={styles['submitError']}>
          <AlertCircle size={13} />
          {submitError}
        </div>
      )}
    </div>
  );
}



function ResultsPhase() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const {
    setup,
    questions,
    answers,
    results,
    accuracy,
    xpEarned,
    correctCount,
    totalCount,
  } = useAppSelector((state) => state.quiz);

  const currentLevel = setup.level as Level;
  const currentDiff = setup.difficulty as Difficulty;

  const pct = accuracy ?? 0;
  const levelColor = getLevelColor(currentLevel);

  
  const CIRC = 339.3;
  const dashOffset = CIRC - (CIRC * pct) / 100;

  const scoreLabel =
    pct >= 90 ? '🏆 Excellent!'
      : pct >= 75 ? '🎯 Great job!'
        : pct >= 60 ? '📚 Good effort!'
          : '💪 Keep practising!';

  return (
    <div className={styles['resultsPage']}>
      <div className={styles['resultsCard']}>

        {/* Score section */}
        <div className={styles['scoreTop']}>
          <div className={styles['scoreCircleWrap']}>
            <svg viewBox="0 0 120 120" className={styles['scoreSvg']}>
              <circle cx="60" cy="60" r="54" className={styles['ringTrack']} />
              <circle
                cx="60" cy="60" r="54"
                className={styles['ringFill']}
                style={{ stroke: levelColor, strokeDashoffset: dashOffset }}
              />
            </svg>
            <div className={styles['scoreInner']}>
              <span className={styles['scorePct']}>{pct}%</span>
              <span className={styles['scoreAccLabel']}>{t('grammar.accuracy', 'accuracy')}</span>
            </div>
          </div>

          <div className={styles['scoreRight']}>
            <p className={styles['scoreEmoji']}>{scoreLabel}</p>

            <div className={styles['scoreStats']}>
              <div className={styles['scoreStat']}>
                <CheckCircle2 size={16} className={styles['iconGreen']} />
                <span>{correctCount ?? 0} / {totalCount ?? 0} {t('grammar.correct', 'correct')}</span>
              </div>
              <div className={styles['scoreStat']}>
                <Zap size={16} className={styles['iconAmber']} />
                <span>+{xpEarned ?? 0} XP {t('grammar.earned', 'earned')}</span>
              </div>
              <div className={styles['scoreStat']}>
                <Trophy size={16} className={styles['iconPurple']} />
                <span>{LEVEL_DISPLAY[currentLevel]} · {DIFFICULTY_LABEL[currentDiff]}</span>
              </div>
            </div>

            <div className={styles['resultActions']}>
              <button
                type="button"
                className={styles['newQuizBtn']}
                style={{ background: levelColor }}
                onClick={() => dispatch(exitQuiz())}
              >
                <RefreshCw size={15} />
                {t('grammar.newQuiz', 'New Quiz')}
              </button>
            </div>
          </div>
        </div>

        {/* Answer review */}
        <div className={styles['reviewSection']}>
          <h2 className={styles['reviewTitle']}>{t('grammar.reviewTitle', 'Answer Review')}</h2>

          <div className={styles['reviewList']}>
            {questions.map((q, qi) => {
              const res = results?.find((r) => r.questionId === q.id);
              const userIdx :any = answers[q.id];
              const isCorrect = res?.isCorrect ?? false;
              const correctIdx = res?.correctIndex ?? q.correctIndex;

              return (
                <div
                  key={q.id}
                  className={`${styles['reviewCard']} ${isCorrect ? styles['reviewOk'] : styles['reviewErr']}`}
                >
                  <div className={styles['reviewCardHead']}>
                    <span className={styles['reviewNum']}>{qi + 1}</span>
                    {isCorrect
                      ? <CheckCircle2 size={15} className={styles['iconGreen']} />
                      : <XCircle size={15} className={styles['iconRed']} />
                    }
                    <p className={styles['reviewQ']}>{q.question}</p>
                  </div>

                  {!isCorrect && (
                    <div className={styles['reviewAnswers']}>
                      <span className={styles['yourAnswer']}>
                        {t('grammar.yourAnswer', 'You')}: {q.options[userIdx] ?? '—'}
                      </span>
                      <span className={styles['correctAnswer']}>
                        {t('grammar.correct', 'Correct')}: {q.options[correctIdx] ?? '—'}
                      </span>
                    </div>
                  )}

                  {q.explanation !== '' && (
                    <p className={styles['explanation']}>
                      <Lightbulb size={11} />
                      {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}



export default function QuizPage() {
  const { phase } = useAppSelector((state) => state.quiz);

  return (
    <div style={{ minHeight: '100%' }}>
      {phase === 'setup' && <SetupPhase />}
      {phase === 'playing' && <PlayingPhase />}
      {phase === 'results' && <ResultsPhase />}
    </div>
  );
}