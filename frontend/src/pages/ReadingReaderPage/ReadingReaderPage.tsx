import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Clock, AlignLeft, BookMarked, ChevronDown,
  CheckCircle2, XCircle, Zap, RefreshCw, AlertCircle,
  Loader2, Trophy, Star,
} from 'lucide-react';

import { useAppDispatch, useAppSelector as useAppSelectorBase } from '@/store/store';
import type { ReadingsRootState } from '@/store/Slices/ReadingsSlice';
import {
  fetchReadingBySlug,
  submitReadingAnswers,
  setQuizAnswer,
  setQuizPhase,
  resetQuiz,
  clearCurrent,
  selectCurrentReading,
  selectCurrentStatus,
  selectCurrentError,
  selectQuizAnswers,
  selectQuizPhase,
  selectSubmitStatus,
  selectSubmitError,
  selectQuizResults,
  selectAccuracy,
  selectXpEarned,
  selectAnsweredCount,
  selectFeedback,
  selectBestAccuracy,
  selectAttemptNumber,
  selectCountedAsCompleted,
} from '@/store/Slices/ReadingsSlice';
import { fetchBookmarks } from '@/store/Slices/BookMarksSlice';

import { BookmarkButton } from '@/components/layout/BookmarkButton/BookmarkButton';
import { getLevelConfig } from '@/constants/reading-meta'; // Обновленный импорт
import type { VocabularyEmbedded, Question } from '@/types/reading/Reading.types';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './ReadingReaderPage.module.css';

const useAppSelector = useAppSelectorBase as unknown as <T>(
  selector: (state: ReadingsRootState) => T,
) => T;

// ─── Vocabulary inline tooltip ────────────────────────────────────────────────

function VocabWord({ word, entry }: { word: string; entry: VocabularyEmbedded }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <button
      type="button"
      ref={ref}
      className={styles['vocabTrigger']}
      onClick={() => setOpen((p) => !p)}
      aria-expanded={open}
      aria-haspopup="dialog"
    >
      {word}
      <span className={styles['vocabDot']} />
      {open && (
        <span className={styles['vocabTooltip']} role="dialog">
          <span className={styles['tooltipWord']}>{entry.word}</span>
          <span className={styles['tooltipTrans']}>{entry.translation}</span>
          {entry.contextSentence !== undefined && (
            <span className={styles['tooltipCtx']}>{entry.contextSentence}</span>
          )}
        </span>
      )}
    </button>
  );
}

// ─── Article content with vocabulary highlighting ─────────────────────────────

function ArticleContent({ content, vocabulary }: { content: string; vocabulary: VocabularyEmbedded[] }) {
  const paragraphs = content.split(/\n+/).filter(Boolean);

  // Оптимизация: компилируем RegExp и собираем Map только при изменении словаря
  const { vocabMap, regex } = useMemo(() => {
    if (vocabulary.length === 0) return { vocabMap: new Map(), regex: null };
    
    const map = new Map(vocabulary.map((v) => [v.word.toLowerCase(), v]));
    const escaped = vocabulary.map((v) => v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const rx = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
    
    return { vocabMap: map, regex: rx };
  }, [vocabulary]);

  if (!regex) {
    return (
      <div className={styles['articleBody']}>
        {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    );
  }

  return (
    <div className={styles['articleBody']}>
      {paragraphs.map((p, pi) => {
        const parts = p.split(regex);
        return (
          <p key={pi}>
            {parts.map((part, idx) => {
              const entry = vocabMap.get(part.toLowerCase());
              return entry !== undefined
                ? <VocabWord key={idx} word={part} entry={entry} />
                : part;
            })}
          </p>
        );
      })}
    </div>
  );
}

// ─── Vocabulary panel ─────────────────────────────────────────────────────────

function VocabPanel({ vocabulary }: { vocabulary: VocabularyEmbedded[] }) {
  const { t } = useTranslation('reading');
  const [open, setOpen] = useState(false);
  
  if (vocabulary.length === 0) return null;

  return (
    <div className={styles['vocabPanel']}>
      <button
        type="button"
        className={styles['vocabPanelHeader']}
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
      >
        <span className={styles['vocabPanelTitle']}>
          <BookMarked size={14} />
          {t('vocabulary')}
          <span className={styles['vocabCount']}>{vocabulary.length}</span>
        </span>
        <ChevronDown
          size={14}
          className={`${styles['chevron']} ${open ? styles['chevronOpen'] : ''}`}
        />
      </button>
      {open && (
        <div className={styles['vocabGrid']}>
          {vocabulary.map((v, i) => (
            <div key={i} className={styles['vocabCard']}>
              <span className={styles['vocabWord']}>{v.word}</span>
              <span className={styles['vocabTrans']}>{v.translation}</span>
              {v.contextSentence !== undefined && (
                <span className={styles['vocabCtxText']}>{v.contextSentence}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ pct }: { pct: number }) {
  const r      = 34;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color  = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className={styles['scoreCircle']}>
      <svg viewBox="0 0 80 80" className={styles['scoreRing']} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--border)" strokeWidth={4} />
        <circle
          cx="40" cy="40" r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div className={styles['scoreInner']}>
        <span className={styles['scorePct']} style={{ color }}>{pct}%</span>
      </div>
    </div>
  );
}

// ─── Quiz section ─────────────────────────────────────────────────────────────

function QuizSection({ questions, materialId }: { questions: Question[]; materialId: string }) {
  const { t }    = useTranslation('reading');
  const dispatch = useAppDispatch();

  const quizAnswers  = useAppSelector(selectQuizAnswers);
  const quizPhase    = useAppSelector(selectQuizPhase);
  const submitStatus = useAppSelector(selectSubmitStatus);
  const submitError  = useAppSelector(selectSubmitError);
  const results      = useAppSelector(selectQuizResults);
  const accuracy     = useAppSelector(selectAccuracy);
  const xpEarned     = useAppSelector(selectXpEarned);
  const feedback     = useAppSelector(selectFeedback);
  const bestAccuracy = useAppSelector(selectBestAccuracy);
  const attemptNum   = useAppSelector(selectAttemptNumber);
  const counted      = useAppSelector(selectCountedAsCompleted);
  const answeredCount = useAppSelector(selectAnsweredCount);

  const isSubmitting = submitStatus === 'loading';
  const allAnswered  = answeredCount === questions.length;
  const remaining    = questions.length - answeredCount;

  const handleSelect = useCallback((qIdx: number, oIdx: number) => {
    if (quizPhase === 'submitted') return;
    dispatch(setQuizAnswer({ questionIdx: qIdx, optionIdx: oIdx }));
    if (quizPhase === 'reading') dispatch(setQuizPhase('answering'));
  }, [quizPhase, dispatch]);

  const handleSubmit = useCallback(() => {
    if (!allAnswered || isSubmitting) return;
    const answers = Object.entries(quizAnswers).map(([qIdx, oIdx]) => ({
      questionIdx: Number(qIdx),
      selectedOptionIdx: oIdx,
    }));
    void dispatch(submitReadingAnswers({ materialId, answers }));
  }, [allAnswered, isSubmitting, quizAnswers, materialId, dispatch]);

  const handleReset = useCallback(() => {
    dispatch(resetQuiz());
  }, [dispatch]);

  // ── Results view ────────────────────────────────────────────────────────────
  if (quizPhase === 'submitted' && results !== null) {
    const correctCount = results.filter((r) => r.isCorrect).length;
    const pct          = accuracy ?? 0;

    return (
      <div className={styles['results']}>
        <div className={styles['resultsTop']}>
          <ScoreRing pct={pct} />
          <div className={styles['resultsMeta']}>
            {counted === true && (
              <div className={styles['completedBanner']}>
                <Trophy size={14} />
                {t('status.completed')}
              </div>
            )}
            <div className={styles['scoreStat']}>
              <CheckCircle2 size={15} className={styles['iconGreen']} />
              <span>{correctCount} / {questions.length} {t('correct')}</span>
            </div>
            <div className={styles['scoreStat']}>
              <Zap size={15} className={styles['iconAmber']} />
              <span>{t('xpEarned', { xp: xpEarned ?? 0 })}</span>
            </div>
            {attemptNum !== null && attemptNum > 1 && bestAccuracy !== null && (
              <div className={styles['scoreStat']}>
                <Star size={15} className={styles['iconAmber']} />
                <span>{t('bestScore')}: {bestAccuracy}%</span>
              </div>
            )}
          </div>
        </div>

        {feedback !== null && (
          <div className={styles['feedbackBox']}>{feedback}</div>
        )}

        <div className={styles['reviewList']}>
          {results.map((res) => {
            const q = questions[res.questionIdx];
            if (q === undefined) return null;
            const userOpt    = q.options[quizAnswers[res.questionIdx] ?? -1];
            const correctOpt = q.options[res.correctIdx];
            return (
              <div
                key={res.questionIdx}
                className={`${styles['reviewCard']} ${res.isCorrect ? styles['reviewOk'] : styles['reviewErr']}`}
              >
                <div className={styles['reviewTop']}>
                  {res.isCorrect
                    ? <CheckCircle2 size={14} className={styles['iconGreen']} />
                    : <XCircle      size={14} className={styles['iconRed']} />}
                  <span className={styles['reviewQ']}>{q.text}</span>
                </div>
                {!res.isCorrect && (
                  <div className={styles['reviewMeta']}>
                    <span className={styles['reviewYour']}>
                      {t('yourAnswer')}: {userOpt?.text ?? '—'}
                    </span>
                    <span className={styles['reviewCorrect']}>
                      {t('correctAnswer')}: {correctOpt?.text ?? '—'}
                    </span>
                  </div>
                )}
                {res.explanation !== undefined && (
                  <p className={styles['reviewExp']}>{res.explanation}</p>
                )}
              </div>
            );
          })}
        </div>

        <button type="button" className={styles['resetBtn']} onClick={handleReset}>
          <RefreshCw size={14} /> {t('tryAgain')}
        </button>
      </div>
    );
  }

  // ── Quiz answering view ─────────────────────────────────────────────────────
  return (
    <div className={styles['quiz']}>
      <div className={styles['quizHeader']}>
        <h2 className={styles['quizTitle']}>{t('questions')}</h2>
        <span className={styles['quizProgress']}>
          {answeredCount} / {questions.length}
        </span>
      </div>

      <div className={styles['questionList']}>
        {questions.map((q, qi) => {
          const selected = quizAnswers[qi];
          return (
            <div key={qi} className={styles['questionCard']}>
              <div className={styles['questionTop']}>
                <span className={styles['questionNum']}>{qi + 1}</span>
                <p className={styles['questionText']}>{q.text}</p>
              </div>
              <div className={styles['optionList']} role="radiogroup">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    type="button"
                    role="radio"
                    aria-checked={selected === oi}
                    className={`${styles['option']} ${selected === oi ? styles['optionSelected'] : ''}`}
                    onClick={() => handleSelect(qi, oi)}
                  >
                    <span className={styles['optionLetter']}>{String.fromCharCode(65 + oi)}</span>
                    <span className={styles['optionText']}>{opt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {submitError !== null && (
        <div className={styles['submitError']}>
          <AlertCircle size={14} />
          <span>{submitError}</span>
        </div>
      )}

      <div className={styles['quizActions']}>
        <span className={styles['quizHint']}>
          {allAnswered
            ? t('readyToSubmit')
            : t('answersLeft', { count: remaining })}
        </span>
        <button
          type="button"
          className={styles['submitBtn']}
          onClick={handleSubmit}
          disabled={!allAnswered || isSubmitting}
        >
          {isSubmitting
            ? <Loader2 size={15} className={styles['spin']} />
            : <CheckCircle2 size={15} />}
          {isSubmitting ? t('submitting') : t('submit')}
        </button>
      </div>
    </div>
  );
}

// ─── Reader page ──────────────────────────────────────────────────────────────

export default function ReadingReaderPage() {
  const { t }      = useTranslation('reading');
  const { slug }   = useParams<{ slug: string }>();
  const navigate   = useNavigate();
  const dispatch   = useAppDispatch();

  const article = useAppSelector(selectCurrentReading);
  const status  = useAppSelector(selectCurrentStatus);
  const error   = useAppSelector(selectCurrentError);

  const [scrollPct, setScrollPct] = useState(0);
  const articleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void dispatch(fetchBookmarks());
  }, [dispatch]);

  useEffect(() => {
    if (slug === undefined) return;
    void dispatch(fetchReadingBySlug(slug));
    return () => { dispatch(clearCurrent()); };
  }, [slug, dispatch]);

  // Оптимизация: requestAnimationFrame для плавного прогресс-бара без лагов
  useEffect(() => {
    let ticking = false;
    
    const handler = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const el = articleRef.current;
          if (el !== null) {
            const { top, height } = el.getBoundingClientRect();
            const visible = Math.max(0, window.innerHeight - top);
            setScrollPct(Math.min(100, Math.round((visible / height) * 100)));
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleBack = useCallback(() => navigate('/reading'), [navigate]);

  if (status === 'loading') return <FullPageSpinner label={t('loading')} />;

  if (error !== null || article === null) {
    return (
      <div className={styles['errorPage']}>
        <AlertCircle size={36} />
        <p>{error ?? t('notFound')}</p>
        <button type="button" className={styles['backBtnLarge']} onClick={handleBack}>
          <ArrowLeft size={15} /> {t('backToList')}
        </button>
      </div>
    );
  }

  // Обновленное использование конфигурации уровня
  const { color: levelColor, label: levelLabel } = getLevelConfig(article.level);
  const questions  = (article.questions ?? []) as Question[];
  const vocabulary = (article.vocabulary ?? []) as VocabularyEmbedded[];

  return (
    <div className={styles['readerPage']}>
      {/* Scroll progress ribbon */}
      <div
        className={styles['progressRibbon']}
        style={{ width: `${scrollPct}%`, background: levelColor }}
      />

      {/* Sticky header */}
      <header className={styles['readerHeader']}>
        <button type="button" className={styles['backBtn']} onClick={handleBack}>
          <ArrowLeft size={15} />
          <span>{t('backToList')}</span>
        </button>
        <div className={styles['headerCenter']}>
          <span className={styles['headerTitle']}>{article.title}</span>
        </div>
        <div className={styles['headerRight']}>
          <span className={styles['levelChip']} style={{ background: levelColor }}>
            {levelLabel ?? article.level}
          </span>
          <span className={styles['metaChip']}>
            <Clock size={11} /> {article.estimatedMinutes} {t('min')}
          </span>
          <span className={styles['metaChip']}>
            <AlignLeft size={11} /> {article.wordCount}
          </span>
        </div>
      </header>

      {/* Article */}
      <main className={styles['articleWrap']} ref={articleRef}>
        <div className={styles['articleInner']}>
          <div className={styles['articleMeta']}>
            <span className={styles['articleTopic']} style={{ color: levelColor }}>
              {article.topic}
            </span>
          </div>

          <div className={styles['articleTitleRow']}>
            <h1 className={styles['articleTitle']}>{article.title}</h1>
            <BookmarkButton targetId={article.id} type={'READING' as never} size="md" />
          </div>

          {article.description !== undefined && (
            <p className={styles['articleLead']}>{article.description}</p>
          )}

          <div className={styles['articleDivider']} style={{ background: levelColor }} />

          <ArticleContent content={article.content} vocabulary={vocabulary} />

          {article.tags.length > 0 && (
            <div className={styles['tagRow']}>
              {article.tags.map((tag) => (
                <span key={tag} className={styles['tag']}>{tag}</span>
              ))}
            </div>
          )}

          <VocabPanel vocabulary={vocabulary} />

          {questions.length > 0 && (
            <QuizSection questions={questions} materialId={article.id} />
          )}
        </div>
      </main>
    </div>
  );
}