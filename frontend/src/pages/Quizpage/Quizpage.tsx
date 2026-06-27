import React, { useCallback, useId, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCheck, ChevronLeft, ChevronRight, X, Zap,
  CheckCircle2, XCircle, RefreshCw, Loader2, AlertCircle,
  Target, Lightbulb, Trophy, BrainCircuit
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  loadQuizQuestions, submitQuiz, updateSetup, selectAnswer,
  goToQuestion, nextQuestion, prevQuestion, exitQuiz,
  type QuizSetup
} from '@/store/Slices/QuizSlice';
import { Level, Difficulty } from '@/types/globalTypes';


import styles from './QuizPage.module.css';

const LEVELS = Object.values(Level);
const DIFFICULTIES = Object.values(Difficulty);
const COUNTS = [5, 10, 20, 30];
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const LEVEL_DISPLAY: Record<Level, string> = {
  [Level.A1]: 'A1', [Level.A1_PLUS]: 'A1+', [Level.A2]: 'A2', [Level.A2_PLUS]: 'A2+',
  [Level.B1]: 'B1', [Level.B1_PLUS]: 'B1+', [Level.B2]: 'B2', [Level.B2_PLUS]: 'B2+',
  [Level.C1]: 'C1', [Level.C2]: 'C2',
};

const RECOMMENDED: Record<Level, Difficulty> = {
  [Level.A1]: Difficulty.EASY, [Level.A1_PLUS]: Difficulty.EASY,
  [Level.A2]: Difficulty.EASY, [Level.A2_PLUS]: Difficulty.MEDIUM,
  [Level.B1]: Difficulty.MEDIUM, [Level.B1_PLUS]: Difficulty.MEDIUM,
  [Level.B2]: Difficulty.MEDIUM, [Level.B2_PLUS]: Difficulty.HARD,
  [Level.C1]: Difficulty.HARD, [Level.C2]: Difficulty.HARD,
};



const SetupPhase: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const topicId = useId();
  const { setup, loadStatus, loadError } = useAppSelector((s) => s.quiz);

  const currentLevel = setup.level as Level;
  const recommendedDiff = RECOMMENDED[currentLevel] ?? Difficulty.MEDIUM;
  const isLoading = loadStatus === 'loading';

  const setSetupValue = useCallback((payload: Partial<QuizSetup>) => {
    dispatch(updateSetup(payload));
  }, [dispatch]);

  const handleStartQuiz = useCallback(() => {
    void dispatch(loadQuizQuestions(setup));
  }, [dispatch, setup]);

  if (isLoading) return <SkeletonPhase />;

  return (
    <div className={styles['setupPage']}>
      <div className={styles['setupCard']}>
        
        {/* Header */}
        <div className={styles['setupHeader']}>
          <div className={styles['setupIcon']}>
            <CheckCheck size={24} />
          </div>
          <div>
            <h1 className={styles['setupTitle']}>{t('grammar.title', 'Grammar Session')}</h1>
            <p className={styles['setupSubtitle']}>
              {t('grammar.subtitle', 'Calibrate your level, set the volume, and start tracking.')}
            </p>
          </div>
        </div>

        {/* Level */}
        <div className={styles['setupSection']}>
          <label className={styles['setupLabel']}>{t('grammar.level', 'Target Level')}</label>
          <div className={styles['levelGrid']}>
            {LEVELS.map((lvl) => {
              const isSelected = currentLevel === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSetupValue({ level: lvl })}
                  className={`${styles['levelBtn']} ${isSelected ? styles['levelBtnActive'] : ''}`}
                  style={isSelected ? { backgroundColor: 'var(--accent)' } : {}}
                >
                  {LEVEL_DISPLAY[lvl]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty */}
        <div className={styles['setupSection']}>
          <div className={styles['setupLabelRow']}>
            <label className={styles['setupLabel']}>{t('grammar.difficulty', 'Difficulty')}</label>
            <span className={styles['setupHint']}>
              <Lightbulb size={12} className="text-[var(--warning)]" />
              {t('grammar.recommended', 'Recommended:')} <strong>{recommendedDiff}</strong>
            </span>
          </div>
          <div className={styles['diffRow']}>
            {DIFFICULTIES.map((d) => {
              const isSelected = setup.difficulty === d;
              const isRecommended = recommendedDiff === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSetupValue({ difficulty: d })}
                  className={`${styles['diffBtn']} ${isSelected ? styles['diffBtnActive'] : ''} ${isRecommended && !isSelected ? styles['diffBtnRec'] : ''}`}
                  style={isSelected ? { backgroundColor: 'var(--accent)' } : {}}
                >
                  {isRecommended && <span className={styles['recTag']}>Rec</span>}
                  <div className={styles['diffDot']} style={{ backgroundColor: isSelected ? '#fff' : 'var(--border)' }} />
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Count */}
        <div className={styles['setupSection']}>
          <label className={styles['setupLabel']}>{t('grammar.questionCount', 'Volume')}</label>
          <div className={styles['countRow']}>
            {COUNTS.map((c) => {
              const isSelected = setup.count === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSetupValue({ count: c })}
                  className={`${styles['countBtn']} ${isSelected ? styles['countBtnActive'] : ''}`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Topic */}
        <div className={styles['setupSection']}>
          <div className={styles['setupLabelRow']}>
            <label className={styles['setupLabel']} htmlFor={topicId}>
              {t('grammar.topic', 'Focus Topic')}
            </label>
            <span className={styles['optionalTag']}>{t('grammar.optional', 'optional')}</span>
          </div>
          <input
            id={topicId}
            type="text"
            value={setup.topic}
            onChange={(e) => setSetupValue({ topic: e.target.value })}
            placeholder={t('grammar.topicPlaceholder', 'e.g. Gerunds, Conditionals')}
            className={styles['topicInput']}
          />
        </div>

        {/* Error Callout */}
        {loadError && (
          <div className={styles['setupError']}>
            <AlertCircle size={16} />
            <span>{loadError}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleStartQuiz}
          disabled={isLoading}
          className={styles['startBtn']}
        >
          <Target size={18} />
          {t('grammar.start', 'Initialize Quiz')}
        </button>
      </div>
    </div>
  );
};



const SkeletonPhase: React.FC = () => (
  <div className={styles['setupPage']}>
    <div className={`${styles['setupCard']} animate-pulse`}>
      <div className={styles['setupHeader']}>
        <div className={`${styles['setupIcon']} bg-[var(--surface-2)]`} />
        <div className="space-y-2 w-full">
          <div className="h-6 w-1/3 bg-[var(--surface-2)] rounded" />
          <div className="h-4 w-2/3 bg-[var(--surface-2)] rounded" />
        </div>
      </div>
      <div className="space-y-6 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-1/4 bg-[var(--surface-2)] rounded" />
            <div className="h-10 w-full bg-[var(--surface-2)] rounded" />
          </div>
        ))}
      </div>
    </div>
  </div>
);



const PlayingPhase: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { setup, questions, currentIdx, answers, submitStatus, submitError } = useAppSelector((s) => s.quiz);

  const currentQuestion = questions[currentIdx] ?? null;
  const totalQuestions = questions.length;
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const isAllAnswered = answeredCount === totalQuestions;
  const isSubmitting = submitStatus === 'loading';
  const selectedAnswerIndex = currentQuestion ? answers[currentQuestion.id] : undefined;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIdx]);

  const handleSubmitQuiz = useCallback(() => {
    void dispatch(submitQuiz({
      answers,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }));
  }, [dispatch, answers]);

  const handleSelectOption = useCallback((idx: number) => {
    if (!currentQuestion) return;
    
    dispatch(selectAnswer({ questionId: currentQuestion.id, index: idx }));

    
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      if (currentIdx < totalQuestions - 1) {
        dispatch(nextQuestion());
      } else if (answeredCount + 1 === totalQuestions && !isSubmitting) {
        
        
      }
    }, 450); 

  }, [dispatch, currentQuestion, questionStartTime, currentIdx, totalQuestions, answeredCount, isSubmitting]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') dispatch(nextQuestion());
      if (e.key === 'ArrowLeft') dispatch(prevQuestion());
      if (e.key === 'Enter' && isAllAnswered && !isSubmitting) handleSubmitQuiz();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dispatch, isAllAnswered, isSubmitting, handleSubmitQuiz]);

  if (!currentQuestion) return null;

  return (
    <div className={styles['playPage']}>
      {/* Top Bar */}
      <div className={styles['playTopBar']}>
        <div className={styles['progressTrack']}>
          <div className={styles['progressFill']} style={{ width: `${progressPercent}%`, backgroundColor: 'var(--accent)' }} />
        </div>
        
        <div className={styles['playMeta']}>
          <div className={styles['playMetaLeft']}>
            <span className={styles['levelChip']} style={{ backgroundColor: 'var(--text-1)' }}>
              {LEVEL_DISPLAY[setup.level as Level]}
            </span>
            <span className={styles['diffChip']} style={{ color: 'var(--text-2)' }}>
              {setup.difficulty}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className={styles['questionCounter']}>
              {currentIdx + 1} / {totalQuestions}
            </span>
            <button
              type="button"
              onClick={() => dispatch(exitQuiz())}
              className={styles['exitBtn']}
              title={t('grammar.exit', 'Terminate Session')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Timeline Dots */}
        <div className={styles['dotNav']}>
          {questions.map((q, i) => {
            const isAnswered = answers[q.id] !== undefined;
            const isCurrent = i === currentIdx;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => dispatch(goToQuestion(i))}
                className={`${styles['navDot']} ${isCurrent ? styles['navDotCurrent'] : ''} ${isAnswered && !isCurrent ? styles['navDotDone'] : ''}`}
                style={isCurrent ? { backgroundColor: 'var(--accent)' } : {}}
                aria-label={`Jump to question ${i + 1}`}
              />
            );
          })}
        </div>
      </div>

      {/* Main Question Area */}
      <div className={styles['questionWrap']}>
        <div className={styles['questionCard']} key={currentQuestion.id}> {/* Key forces re-render animation */}
          {currentQuestion.topic && (
            <span className={styles['qTopic']}>{currentQuestion.topic}</span>
          )}
          <h2 className={styles['questionText']}>{currentQuestion.question}</h2>

          <div className={styles['optionList']} role="radiogroup">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedAnswerIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectOption(idx)}
                  className={`${styles['option']} ${isSelected ? styles['optionSelected'] : ''}`}
                >
                  <span className={styles['optionLetter']} style={isSelected ? { backgroundColor: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : {}}>
                    {LETTERS[idx]}
                  </span>
                  <span className={styles['optionText']} style={isSelected ? { fontWeight: 600, color: 'var(--text-1)' } : {}}>
                    {option}
                  </span>
                  {isSelected && (
                    <div className={styles['optionCheck']}>
                      <CheckCircle2 size={20} color="var(--accent)" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className={styles['navRow']}>
        <button
          type="button"
          onClick={() => dispatch(prevQuestion())}
          disabled={currentIdx === 0}
          className={styles['navBtn']}
        >
          <ChevronLeft size={16} /> {t('grammar.prev', 'Back')}
        </button>

        <div className={styles['navCenter']}>
          <span className={styles['answeredCount']}>
            {answeredCount} / {totalQuestions} {t('grammar.answered', 'Completed')}
          </span>
        </div>

        {currentIdx < totalQuestions - 1 ? (
          <button
            type="button"
            onClick={() => dispatch(nextQuestion())}
            className={styles['navBtn']}
          >
            {t('grammar.next', 'Next')} <ChevronRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            disabled={!isAllAnswered || isSubmitting}
            onClick={handleSubmitQuiz}
            className={`${styles['submitBtn']} ${(!isAllAnswered || isSubmitting) ? styles['submitBtnDisabled'] : ''}`}
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {isSubmitting ? <Loader2 size={16} className={styles['spin']} /> : <CheckCheck size={16} />}
            {t('grammar.submit', 'Finalize')}
          </button>
        )}
      </div>

      {submitError && (
        <div className={styles['submitError']}>
          <AlertCircle size={14} /> {submitError}
        </div>
      )}
    </div>
  );
};



const ResultsPhase: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { questions, answers, results, accuracy, xpEarned, correctCount, totalCount, setup, feedback, countedAsCompleted } = useAppSelector((s) => s.quiz);

  const finalScorePercent = accuracy ?? 0;
  const circleRadius = 54;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference * (1 - finalScorePercent / 100);

  const statusConfig = useMemo(() => {
    if (finalScorePercent === 100) return { label: 'Flawless Masterpiece', color: 'var(--success)', emoji: '🏆' };
    if (finalScorePercent >= 80) return { label: 'Exceptional Performance', color: 'var(--success)', emoji: '✨' };
    if (finalScorePercent >= 70) return { label: 'Solid Competence', color: '#f59e0b', emoji: '👍' };
    if (finalScorePercent >= 60) return { label: 'Needs Refinement', color: '#f59e0b', emoji: '📚' };
    return { label: 'Targeted Review Required', color: 'var(--danger)', emoji: '💪' };
  }, [finalScorePercent]);

  return (
    <div className={styles['resultsPage']}>
      <div className={styles['resultsCard']}>
        
        {/* Score Header */}
        <div className={styles['scoreTop']}>
          <div className={styles['scoreCircleWrap']}>
            <svg viewBox="0 0 120 120" className={styles['scoreSvg']}>
              <circle cx="60" cy="60" r={circleRadius} className={styles['ringTrack']} />
              <circle 
                cx="60" cy="60" r={circleRadius} 
                className={styles['ringFill']}
                stroke={statusConfig.color}
                strokeDasharray={circumference}
                style={{ strokeDashoffset }}
              />
            </svg>
            <div className={styles['scoreInner']}>
              <span className={styles['scorePct']}>{finalScorePercent}%</span>
              <span className={styles['scoreAccLabel']}>{t('grammar.accuracy', 'Accuracy')}</span>
            </div>
          </div>

          <div className={styles['scoreRight']}>
            <div className={styles['scoreEmoji']}>
              {statusConfig.emoji} {statusConfig.label}
            </div>
            
            <div className={styles['scoreStats']}>
              <div className={styles['scoreStat']}>
                <CheckCircle2 size={16} className={styles['iconGreen']} />
                <strong>{correctCount} / {totalCount}</strong> {t('grammar.correct', 'Correct')}
              </div>
              <div className={styles['scoreStat']}>
                <Zap size={16} className={styles['iconAmber']} />
                <strong>+{xpEarned} XP</strong> {t('grammar.earned', 'Allocated')}
              </div>
              <div className={styles['scoreStat']}>
                <Trophy size={16} className={styles['iconPurple']} />
                <span className="uppercase text-xs font-bold tracking-wider">
                  {LEVEL_DISPLAY[setup.level as Level]} · {setup.difficulty}
                </span>
              </div>
            </div>

            {countedAsCompleted ? (
              <div className={styles['countedNote']}>
                <BrainCircuit size={14} /> {t('grammar.counted', 'Synchronized with progression engine')}
              </div>
            ) : (
              <div className={styles['notCountedNote']}>
                <AlertCircle size={14} /> {t('grammar.notCounted', 'Min 5 answers required for sync')}
              </div>
            )}
          </div>
        </div>

        {/* Action Row */}
        <div className={styles['resultActions']}>
          <button
            type="button"
            onClick={() => dispatch(exitQuiz())}
            className={styles['newQuizBtn']}
            style={{ backgroundColor: 'var(--text-1)' }}
          >
            <RefreshCw size={16} /> {t('grammar.newQuiz', 'Generate New Task')}
          </button>
        </div>

        {/* AI Feedback */}
        {feedback && (
          <div className={styles['feedbackCard']}>
            <div className={styles['feedbackHeader']}>
              <Lightbulb size={14} /> {t('grammar.feedback', 'Algorithmic Diagnostics')}
            </div>
            <p className={styles['feedbackText']}>{feedback}</p>
          </div>
        )}

        {/* Review List */}
        <div className={styles['reviewSection']}>
          <h3 className={styles['reviewTitle']}>{t('grammar.reviewTitle', 'Granular Review')}</h3>
          <div className={styles['reviewList']}>
            {questions.map((q, qi) => {
              const report = results?.find((r) => r.questionId === q.id);
              const userIdx = answers[q.id];
              const isCorrect = report?.isCorrect ?? false;
              const correctIdx = report?.correctIndex ?? q.correctIndex;

              return (
                <div key={q.id} className={`${styles['reviewCard']} ${isCorrect ? styles['reviewOk'] : styles['reviewErr']}`}>
                  <div className={styles['reviewCardHead']}>
                    <div className={styles['reviewNum']}>{qi + 1}</div>
                    <div className={styles['reviewQ']}>{q.question}</div>
                    {isCorrect ? (
                      <CheckCircle2 size={18} className={styles['iconGreen']} />
                    ) : (
                      <XCircle size={18} className={styles['iconRed']} />
                    )}
                  </div>
                  
                  {!isCorrect && (
                    <div className={styles['reviewAnswers']}>
                      <div className={styles['yourAnswer']}>
                        {t('grammar.yourAnswer', 'Your Input')}: {userIdx !== undefined ? q.options[userIdx] : '—'}
                      </div>
                      <div className={styles['correctAnswer']}>
                        {t('grammar.correct', 'Correct Mapping')}: {q.options[correctIdx] ?? '—'}
                      </div>
                    </div>
                  )}

                  {q.explanation && (
                    <div className={styles['explanation']}>
                      <Lightbulb size={14} />
                      <p>{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};



export default function QuizPage() {
  const { phase } = useAppSelector((s) => s.quiz);
  
  return (
    <main className="w-full h-full bg-[var(--bg)] transition-colors duration-300">
      {phase === 'setup' && <SetupPhase />}
      {phase === 'playing' && <PlayingPhase />}
      {phase === 'results' && <ResultsPhase />}
    </main>
  );
}
