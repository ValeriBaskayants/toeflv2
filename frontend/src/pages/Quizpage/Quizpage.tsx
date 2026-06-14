import { useCallback, useId, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCheck, ChevronLeft, ChevronRight, X, Zap,
  CheckCircle2, XCircle, RefreshCw, Loader2, AlertCircle,
  Target, Lightbulb, Trophy,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  loadQuizQuestions, submitQuiz, updateSetup, selectAnswer,
  goToQuestion, nextQuestion, prevQuestion, exitQuiz,
  type QuizSetup,
} from '@/store/Slices/QuizSlice';
import styles from './Quizpage.module.css';
import { Level, Difficulty } from '@/types/globalTypes';

// ─── Constants ─────────────────────────────────────────────────────────────

const LEVELS: Level[] = [
  Level.A1, Level.A1_PLUS, Level.A2, Level.A2_PLUS,
  Level.B1, Level.B1_PLUS, Level.B2, Level.B2_PLUS, Level.C1, Level.C2,
];

const LEVEL_DISPLAY: Record<Level, string> = {
  [Level.A1]: 'A1', [Level.A1_PLUS]: 'A1+', [Level.A2]: 'A2',
  [Level.A2_PLUS]: 'A2+', [Level.B1]: 'B1', [Level.B1_PLUS]: 'B1+',
  [Level.B2]: 'B2', [Level.B2_PLUS]: 'B2+', [Level.C1]: 'C1', [Level.C2]: 'C2',
};

const LEVEL_COLOR: Record<Level, string> = {
  [Level.A1]: '#22c55e', [Level.A1_PLUS]: '#16a34a', [Level.A2]: '#14b8a6',
  [Level.A2_PLUS]: '#0d9488', [Level.B1]: '#3b82f6', [Level.B1_PLUS]: '#2563eb',
  [Level.B2]: '#8b5cf6', [Level.B2_PLUS]: '#7c3aed', [Level.C1]: '#f59e0b', [Level.C2]: '#ef4444',
};

const RECOMMENDED: Record<Level, Difficulty> = {
  [Level.A1]: Difficulty.EASY, [Level.A1_PLUS]: Difficulty.EASY,
  [Level.A2]: Difficulty.EASY, [Level.A2_PLUS]: Difficulty.MEDIUM,
  [Level.B1]: Difficulty.MEDIUM, [Level.B1_PLUS]: Difficulty.MEDIUM,
  [Level.B2]: Difficulty.MEDIUM, [Level.B2_PLUS]: Difficulty.HARD,
  [Level.C1]: Difficulty.HARD, [Level.C2]: Difficulty.HARD,
};

const DIFFICULTIES: Difficulty[] = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];

const DIFF_COLOR: Record<Difficulty, string> = {
  [Difficulty.EASY]: '#22c55e', [Difficulty.MEDIUM]: '#f59e0b', [Difficulty.HARD]: '#ef4444',
};
const DIFF_LABEL: Record<Difficulty, string> = {
  [Difficulty.EASY]: 'Easy', [Difficulty.MEDIUM]: 'Medium', [Difficulty.HARD]: 'Hard',
};

const COUNTS = [5, 10, 20, 30];
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function levelColor(l: Level) { return LEVEL_COLOR[l] ?? '#6366f1'; }

// ─── SetupPhase ─────────────────────────────────────────────────────────────

function SetupPhase() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const topicId = useId();
  const { setup, loadStatus, loadError } = useAppSelector((s) => s.quiz);
  const lv = setup.level as Level;
  const rec = RECOMMENDED[lv] ?? Difficulty.MEDIUM;
  const loading = loadStatus === 'loading';

  const patch = useCallback((p: Partial<QuizSetup>) => dispatch(updateSetup(p)), [dispatch]);
  const handleStart = useCallback(() => void dispatch(loadQuizQuestions(setup)), [dispatch, setup]);

  return (
    <div className={styles['setupPage']}>
      <div className={styles['setupCard']}>
        <div className={styles['setupHeader']}>
          <div className={styles['setupIcon']}><CheckCheck size={22} /></div>
          <div>
            <h1 className={styles['setupTitle']}>{t('grammar.title', 'Grammar Quiz')}</h1>
            <p className={styles['setupSubtitle']}>{t('grammar.subtitle', 'Test your knowledge, earn XP, track mistakes')}</p>
          </div>
        </div>

        {/* Level */}
        <div className={styles['setupSection']}>
          <label className={styles['setupLabel']}>{t('grammar.level', 'Your level')}</label>
          <div className={styles['levelGrid']}>
            {LEVELS.map((lvl) => (
              <button key={lvl} type="button"
                className={`${styles['levelBtn']} ${lv === lvl ? styles['levelBtnActive'] : ''}`}
                style={lv === lvl ? { background: levelColor(lvl), borderColor: levelColor(lvl) } : { '--lc': levelColor(lvl) } as React.CSSProperties}
                onClick={() => patch({ level: lvl })}
              >{LEVEL_DISPLAY[lvl]}</button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className={styles['setupSection']}>
          <div className={styles['setupLabelRow']}>
            <label className={styles['setupLabel']}>{t('grammar.difficulty', 'Difficulty')}</label>
            <span className={styles['setupHint']}>
              <Lightbulb size={11} />
              {t('grammar.recommended', 'Recommended for')} {LEVEL_DISPLAY[lv]}:{' '}
              <strong style={{ color: DIFF_COLOR[rec] }}>{DIFF_LABEL[rec]}</strong>
            </span>
          </div>
          <div className={styles['diffRow']}>
            {DIFFICULTIES.map((d) => {
              const isRec = d === rec;
              const isActive = (setup.difficulty as Difficulty) === d;
              return (
                <button key={d} type="button"
                  className={`${styles['diffBtn']} ${isActive ? styles['diffBtnActive'] : ''} ${isRec ? styles['diffBtnRec'] : ''}`}
                  style={isActive ? { background: DIFF_COLOR[d], borderColor: DIFF_COLOR[d], '--dc': DIFF_COLOR[d] } as React.CSSProperties : { '--dc': DIFF_COLOR[d] } as React.CSSProperties}
                  onClick={() => patch({ difficulty: d })}
                >
                  <span className={styles['diffDot']} style={{ background: isActive ? '#fff' : DIFF_COLOR[d] }} />
                  {DIFF_LABEL[d]}
                  {isRec && !isActive && <span className={styles['recTag']}>rec</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Count */}
        <div className={styles['setupSection']}>
          <label className={styles['setupLabel']}>{t('grammar.questionCount', 'Number of questions')}</label>
          <div className={styles['countRow']}>
            {COUNTS.map((c) => (
              <button key={c} type="button"
                className={`${styles['countBtn']} ${setup.count === c ? styles['countBtnActive'] : ''}`}
                onClick={() => patch({ count: c })}
              >{c}</button>
            ))}
          </div>
        </div>

        {/* Topic */}
        <div className={styles['setupSection']}>
          <label className={styles['setupLabel']} htmlFor={topicId}>
            {t('grammar.topic', 'Topic')}
            <span className={styles['optionalTag']}>{t('grammar.optional', 'optional')}</span>
          </label>
          <input id={topicId} type="text" className={styles['topicInput']}
            value={setup.topic}
            onChange={(e) => patch({ topic: e.target.value })}
            placeholder={t('grammar.topicPlaceholder', 'e.g. Present Perfect, Modal Verbs…')}
          />
        </div>

        {loadError !== null && (
          <div className={styles['setupError']}>
            <AlertCircle size={14} /><span>{loadError}</span>
          </div>
        )}

        <button type="button" className={styles['startBtn']} onClick={handleStart} disabled={loading}>
          {loading ? <Loader2 size={18} className={styles['spin']} /> : <Target size={18} />}
          {loading ? t('grammar.loading', 'Loading questions…') : t('grammar.start', 'Start Quiz')}
        </button>
      </div>
    </div>
  );
}

// ─── PlayingPhase ────────────────────────────────────────────────────────────

function PlayingPhase() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const { setup, questions, currentIdx, answers, submitStatus, submitError } =
    useAppSelector((s) => s.quiz);

  const lv   = setup.level as Level;
  const diff = setup.difficulty as Difficulty;
  const lc   = levelColor(lv);
  const question    = questions[currentIdx] ?? null;
  const total       = questions.length;
  const answeredCnt = Object.keys(answers).length;
  const allAnswered = answeredCnt === total;
  const isSubmitting = submitStatus === 'loading';
  const selected = question !== null ? answers[question.id] : undefined;
  const progress = total > 0 ? Math.round((answeredCnt / total) * 100) : 0;

  const handleSelect = useCallback((idx: number) => {
    if (question === null) return;
    dispatch(selectAnswer({ questionId: question.id, index: idx }));
  }, [dispatch, question]);

  const handleSubmit = useCallback(() => {
    void dispatch(submitQuiz({
      answers,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }));
  }, [dispatch, answers]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') dispatch(nextQuestion());
      if (e.key === 'ArrowLeft')  dispatch(prevQuestion());
      if (e.key === 'Enter' && allAnswered && currentIdx === total - 1 && !isSubmitting) {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, allAnswered, currentIdx, total, isSubmitting, handleSubmit]);

  if (question === null) return null;

  return (
    <div className={styles['playPage']}>
      {/* Progress + meta bar */}
      <div className={styles['playTopBar']}>
        <div className={styles['progressTrack']}>
          <div className={styles['progressFill']} style={{ width: `${progress}%`, background: lc }} />
        </div>
        <div className={styles['playMeta']}>
          <div className={styles['playMetaLeft']}>
            <span className={styles['levelChip']} style={{ background: lc }}>{LEVEL_DISPLAY[lv]}</span>
            <span className={styles['diffChip']} style={{ color: DIFF_COLOR[diff] }}>{DIFF_LABEL[diff]}</span>
          </div>
          <span className={styles['questionCounter']}>{currentIdx + 1} / {total}</span>
          <button type="button" className={styles['exitBtn']}
            onClick={() => dispatch(exitQuiz())} title={t('grammar.exit', 'Exit quiz')}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Dot nav */}
      <div className={styles['dotNav']}>
        {questions.map((q, i) => {
          const done = answers[q.id] !== undefined;
          const curr = i === currentIdx;
          return (
            <button key={q.id} type="button"
              className={`${styles['navDot']} ${curr ? styles['navDotCurrent'] : ''} ${done && !curr ? styles['navDotDone'] : ''}`}
              style={curr ? { background: lc } : {}}
              onClick={() => dispatch(goToQuestion(i))}
              aria-label={`Question ${i + 1}`}
            />
          );
        })}
      </div>

      {/* Question card */}
      <div className={styles['questionWrap']}>
        <div className={styles['questionCard']}>
          {question.topic !== '' && <span className={styles['qTopic']}>{question.topic}</span>}
          <p className={styles['questionText']}>{question.question}</p>

          <div className={styles['optionList']} role="radiogroup">
            {question.options.map((opt, idx) => {
              const isSel = selected === idx;
              return (
                <button key={idx} type="button" role="radio" aria-checked={isSel}
                  className={`${styles['option']} ${isSel ? styles['optionSelected'] : ''}`}
                  style={isSel ? { borderColor: lc, background: `${lc}14` } : {}}
                  onClick={() => handleSelect(idx)}
                >
                  <span className={styles['optionLetter']}
                    style={isSel ? { background: lc, color: '#fff' } : {}}
                  >{LETTERS[idx]}</span>
                  <span className={styles['optionText']}>{opt}</span>
                  {isSel && <span className={styles['optionCheck']} style={{ color: lc }}><CheckCircle2 size={16} /></span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation row */}
      <div className={styles['navRow']}>
        <button type="button" className={styles['navBtn']}
          onClick={() => dispatch(prevQuestion())} disabled={currentIdx === 0}>
          <ChevronLeft size={16} />{t('grammar.prev', 'Previous')}
        </button>

        <div className={styles['navCenter']}>
          <span className={styles['answeredCount']}>
            {answeredCnt} / {total} {t('grammar.answered', 'answered')}
          </span>
        </div>

        {currentIdx < total - 1 ? (
          <button type="button" className={styles['navBtn']}
            onClick={() => dispatch(nextQuestion())}>
            {t('grammar.next', 'Next')}<ChevronRight size={16} />
          </button>
        ) : (
          <button type="button"
            className={`${styles['submitBtn']} ${!allAnswered ? styles['submitBtnDisabled'] : ''}`}
            style={allAnswered ? { background: lc } : {}}
            onClick={handleSubmit} disabled={!allAnswered || isSubmitting}
          >
            {isSubmitting
              ? <><Loader2 size={14} className={styles['spin']} />{t('grammar.submitting', 'Submitting…')}</>
              : t('grammar.submit', 'Submit Quiz')
            }
          </button>
        )}
      </div>

      {submitError !== null && (
        <div className={styles['submitError']}>
          <AlertCircle size={14} />{submitError}
        </div>
      )}
    </div>
  );
}

// ─── ResultsPhase ────────────────────────────────────────────────────────────

function ResultsPhase() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const {
    questions, answers, results, accuracy, xpEarned,
    correctCount, totalCount, setup, feedback, countedAsCompleted,
  } = useAppSelector((s) => s.quiz);

  const lv   = setup.level as Level;
  const diff = setup.difficulty as Difficulty;
  const lc   = levelColor(lv);
  const pct  = accuracy ?? 0;

  // SVG ring — r=54, circumference ≈ 339.3
  const R = 54;
  const CIRC = 2 * Math.PI * R;
  const ringOffset = CIRC * (1 - pct / 100);
  const ringColor  = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';

  const scoreLabel =
    pct === 100 ? 'Perfect! 🎉' :
    pct >= 80   ? 'Great job! ✨' :
    pct >= 70   ? 'Good work 👍' :
    pct >= 60   ? 'Keep going 📚' :
                  'More practice 💪';

  return (
    <div className={styles['resultsPage']}>
      <div className={styles['resultsCard']}>

        {/* ── Score header ── */}
        <div className={styles['scoreTop']}>
          <div className={styles['scoreCircleWrap']}>
            <svg viewBox="0 0 120 120" className={styles['scoreSvg']}>
              <circle cx="60" cy="60" r={R} className={styles['ringTrack']} />
              <circle cx="60" cy="60" r={R}
                className={styles['ringFill']}
                stroke={ringColor}
                strokeDasharray={CIRC}
                strokeDashoffset={ringOffset}
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
                <span>{correctCount ?? 0} / {totalCount ?? 0} {t('grammar.correct', 'Correct')}</span>
              </div>
              <div className={styles['scoreStat']}>
                <Zap size={16} className={styles['iconAmber']} />
                <span>+{xpEarned ?? 0} XP {t('grammar.earned', 'earned')}</span>
              </div>
              <div className={styles['scoreStat']}>
                <Trophy size={16} className={styles['iconPurple']} />
                <span>{LEVEL_DISPLAY[lv]} · {DIFF_LABEL[diff]}</span>
              </div>
            </div>

            {countedAsCompleted === true && (
              <div className={styles['countedNote']}>
                <CheckCircle2 size={13} />
                {t('grammar.counted', 'Counted toward your progress!')}
              </div>
            )}
            {countedAsCompleted === false && (
              <div className={styles['notCountedNote']}>
                <AlertCircle size={13} />
                {t('grammar.notCounted', 'Answer 5+ questions to count toward progress')}
              </div>
            )}

            <div className={styles['resultActions']}>
              <button type="button" className={styles['newQuizBtn']}
                style={{ background: lc }} onClick={() => dispatch(exitQuiz())}>
                <RefreshCw size={15} />{t('grammar.newQuiz', 'New Quiz')}
              </button>
            </div>
          </div>
        </div>

        {/* ── AI Feedback ── */}
        {feedback !== null && feedback !== '' && (
          <div className={styles['feedbackCard']}>
            <div className={styles['feedbackHeader']}>
              <Lightbulb size={14} />
              {t('grammar.feedback', 'AI Feedback')}
            </div>
            <p className={styles['feedbackText']}>{feedback}</p>
          </div>
        )}

        {/* ── Answer review ── */}
        <div className={styles['reviewSection']}>
          <h2 className={styles['reviewTitle']}>{t('grammar.reviewTitle', 'Answer Review')}</h2>
          <div className={styles['reviewList']}>
            {questions.map((q, qi) => {
              const res        = results?.find((r) => r.questionId === q.id);
              const userIdx    = answers[q.id];
              const isCorrect  = res?.isCorrect ?? false;
              const correctIdx = res?.correctIndex ?? q.correctIndex;

              return (
                <div key={q.id}
                  className={`${styles['reviewCard']} ${isCorrect ? styles['reviewOk'] : styles['reviewErr']}`}
                >
                  <div className={styles['reviewCardHead']}>
                    <span className={styles['reviewNum']}>{qi + 1}</span>
                    {isCorrect
                      ? <CheckCircle2 size={15} className={styles['iconGreen']} />
                      : <XCircle     size={15} className={styles['iconRed']}   />
                    }
                    <p className={styles['reviewQ']}>{q.question}</p>
                  </div>

                  {!isCorrect && (
                    <div className={styles['reviewAnswers']}>
                      <span className={styles['yourAnswer']}>
                        {t('grammar.yourAnswer', 'You')}: {userIdx !== undefined ? q.options[userIdx] : '—'}
                      </span>
                      <span className={styles['correctAnswer']}>
                        {t('grammar.correct', 'Correct')}: {q.options[correctIdx] ?? '—'}
                      </span>
                    </div>
                  )}

                  {q.explanation !== '' && (
                    <p className={styles['explanation']}>
                      <Lightbulb size={11} />{q.explanation}
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

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const { phase } = useAppSelector((s) => s.quiz);
  return (
    <div style={{ minHeight: '100%' }}>
      {phase === 'setup'   && <SetupPhase />}
      {phase === 'playing' && <PlayingPhase />}
      {phase === 'results' && <ResultsPhase />}
    </div>
  );
}