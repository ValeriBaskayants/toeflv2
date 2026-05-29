import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Clock,
  AlignLeft,
  BookMarked,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Zap,
  RefreshCw,
  AlertCircle,
  Loader2,
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
} from '@/store/Slices/ReadingsSlice';

// НОВЫЕ ИМПОРТЫ ДЛЯ ЗАКЛАДОК
import { fetchBookmarks } from '@/store/Slices/BookMarksSlice';
import { BookmarkButton } from '@/components/layout/BookmarkButton/BookmarkButton';

import { getLevelColor, LEVEL_DISPLAY } from '@/constants/level';
import type { VocabularyEmbedded, Question } from '@/types/reading/Reading.types';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './ReadingReaderPage.module.css';

const useAppSelector = useAppSelectorBase as unknown as <T>(
  selector: (state: ReadingsRootState) => T,
) => T;

interface VocabWordProps {
  word: string;
  entry: VocabularyEmbedded;
}

function VocabWord({ word, entry }: VocabWordProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <span ref={ref} className={styles['vocabTrigger']} onClick={() => setOpen((p) => !p)}>
      {word}
      <span className={styles['vocabDot']} />
      {open && (
        <span className={styles['vocabTooltip']}>
          <span className={styles['tooltipWord']}>{entry.word}</span>
          <span className={styles['tooltipTrans']}>{entry.translation}</span>
          {entry.contextSentence !== undefined && (
            <span className={styles['tooltipCtx']}>{entry.contextSentence}</span>
          )}
        </span>
      )}
    </span>
  );
}

function ArticleContent({
  content,
  vocabulary,
}: {
  content: string;
  vocabulary: VocabularyEmbedded[];
}) {
  const paragraphs = content.split(/\n+/).filter(Boolean);

  if (vocabulary.length === 0) {
    return (
      <div className={styles['articleBody']}>
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    );
  }

  const vocabMap = new Map(vocabulary.map((v) => [v.word.toLowerCase(), v]));
  const escaped = vocabulary.map((v) => v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');

  return (
    <div className={styles['articleBody']}>
      {paragraphs.map((p, pi) => {
        const parts = p.split(regex);
        return (
          <p key={pi}>
            {parts.map((part, idx) => {
              const entry = vocabMap.get(part.toLowerCase());
              if (entry !== undefined) {
                return <VocabWord key={idx} word={part} entry={entry} />;
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
}

function VocabPanel({ vocabulary }: { vocabulary: VocabularyEmbedded[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (vocabulary.length === 0) {
    return null;
  }

  return (
    <div className={styles['vocabPanel']}>
      <button
        type="button"
        className={styles['vocabPanelHeader']}
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
      >
        <span className={styles['vocabPanelTitle']}>
          <BookMarked size={15} />
          {t('reading.vocabulary', 'Vocabulary')}
          <span className={styles['vocabCount']}>{vocabulary.length}</span>
        </span>
        <ChevronDown
          size={15}
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

interface QuizSectionProps {
  questions: Question[];
  materialId: string;
}

function QuizSection({ questions, materialId }: QuizSectionProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const quizAnswers = useAppSelector(selectQuizAnswers);
  const quizPhase = useAppSelector(selectQuizPhase);
  const submitStatus = useAppSelector(selectSubmitStatus);
  const submitError = useAppSelector(selectSubmitError);
  const results = useAppSelector(selectQuizResults);
  const accuracy = useAppSelector(selectAccuracy);
  const xpEarned = useAppSelector(selectXpEarned);
  const answeredCount = useAppSelector(selectAnsweredCount);

  const isSubmitting = submitStatus === 'loading';
  const allAnswered = answeredCount === questions.length;

  const handleSelect = useCallback(
    (qIdx: number, oIdx: number) => {
      if (quizPhase === 'submitted') {
        return;
      }
      dispatch(setQuizAnswer({ questionIdx: qIdx, optionIdx: oIdx }));
      if (quizPhase === 'reading') {
        dispatch(setQuizPhase('answering'));
      }
    },
    [quizPhase, dispatch],
  );

  const handleSubmit = useCallback(() => {
    if (!allAnswered || isSubmitting) {
      return;
    }
    const answers = Object.entries(quizAnswers).map(([qIdx, oIdx]) => ({
      questionIdx: Number(qIdx),
      selectedOptionIdx: oIdx,
    }));
    void dispatch(submitReadingAnswers({ materialId, answers }));
  }, [allAnswered, isSubmitting, quizAnswers, materialId, dispatch]);

  const handleReset = useCallback(() => {
    dispatch(resetQuiz());
  }, [dispatch]);

  if (quizPhase === 'submitted' && results !== null) {
    const correctCount = results.filter((r) => r.isCorrect).length;
    const pct = accuracy ?? 0;

    return (
      <div className={styles['results']}>
        <div className={styles['scoreCircle']}>
          <svg viewBox="0 0 80 80" className={styles['scoreRing']}>
            <circle cx="40" cy="40" r="34" className={styles['ringTrack']} />
            <circle
              cx="40"
              cy="40"
              r="34"
              className={styles['ringFill']}
              style={{ strokeDashoffset: `${213.6 - (213.6 * pct) / 100}` }}
            />
          </svg>
          <div className={styles['scoreInner']}>
            <span className={styles['scorePct']}>{pct}%</span>
            <span className={styles['scoreLabel']}>{t('reading.accuracy', 'accuracy')}</span>
          </div>
        </div>

        <div className={styles['scoreStats']}>
          <div className={styles['scoreStat']}>
            <CheckCircle2 size={16} className={styles['statIconGreen']} />
            <span>
              {correctCount} / {questions.length} {t('reading.correct', 'correct')}
            </span>
          </div>
          <div className={styles['scoreStat']}>
            <Zap size={16} className={styles['statIconAmber']} />
            <span>+{xpEarned ?? 0} XP</span>
          </div>
        </div>

        <div className={styles['reviewList']}>
          {results.map((res) => {
            const q = questions[res.questionIdx];
            if (q === undefined) {
              return null;
            }
            const userOpt = q.options[quizAnswers[res.questionIdx] ?? -1];
            const correctOpt = q.options[res.correctIdx];
            return (
              <div
                key={res.questionIdx}
                className={`${styles['reviewCard']} ${res.isCorrect ? styles['reviewOk'] : styles['reviewErr']}`}
              >
                <div className={styles['reviewTop']}>
                  {res.isCorrect ? (
                    <CheckCircle2 size={14} className={styles['statIconGreen']} />
                  ) : (
                    <XCircle size={14} className={styles['statIconRed']} />
                  )}
                  <span className={styles['reviewQ']}>{q.text}</span>
                </div>
                {!res.isCorrect && (
                  <div className={styles['reviewMeta']}>
                    <span className={styles['reviewYour']}>
                      {t('reading.yourAnswer', 'Your answer')}: {userOpt?.text ?? '—'}
                    </span>
                    <span className={styles['reviewCorrect']}>
                      {t('reading.correctAnswer', 'Correct')}: {correctOpt?.text ?? '—'}
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
          <RefreshCw size={14} /> {t('reading.tryAgain', 'Try Again')}
        </button>
      </div>
    );
  }

  return (
    <div className={styles['quiz']}>
      <div className={styles['quizHeader']}>
        <h2 className={styles['quizTitle']}>{t('reading.questions', 'Comprehension Check')}</h2>
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
                {q.options.map((opt: (typeof q.options)[0], oi: number) => (
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
            ? t('reading.readyToSubmit', 'All questions answered')
            : t('reading.answersLeft', `${questions.length - answeredCount} remaining`)}
        </span>
        <button
          type="button"
          className={styles['submitBtn']}
          onClick={handleSubmit}
          disabled={!allAnswered || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 size={15} className={styles['spin']} />
          ) : (
            <CheckCircle2 size={15} />
          )}
          {isSubmitting
            ? t('reading.submitting', 'Submitting…')
            : t('reading.submit', 'Submit Answers')}
        </button>
      </div>
    </div>
  );
}

export default function ReadingReaderPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const article = useAppSelector(selectCurrentReading);
  const status = useAppSelector(selectCurrentStatus);
  const error = useAppSelector(selectCurrentError);

  const [scrollPct, setScrollPct] = useState(0);
  const articleRef = useRef<HTMLDivElement>(null);

  // ЗАГРУЗКА ЗАКЛАДОК ПРИ ИНИЦИАЛИЗАЦИИ
  useEffect(() => {
    void dispatch(fetchBookmarks());
  }, [dispatch]);

  useEffect(() => {
    if (slug === undefined) {
      return;
    }
    void dispatch(fetchReadingBySlug(slug));
    return () => {
      dispatch(clearCurrent());
    };
  }, [slug, dispatch]);

  useEffect(() => {
    const handler = () => {
      const el = articleRef.current;
      if (el === null) {
        return;
      }
      const { top, height } = el.getBoundingClientRect();
      const visible = Math.max(0, window.innerHeight - top);
      const pct = Math.min(100, Math.round((visible / height) * 100));
      setScrollPct(pct);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleBack = useCallback(() => {
    navigate('/reading');
  }, [navigate]);

  if (status === 'loading') {
    return <FullPageSpinner label={t('reading.loading', 'Loading article…')} />;
  }

  if (error !== null || article === null) {
    return (
      <div className={styles['errorPage']}>
        <AlertCircle size={36} />
        <p>{error ?? t('reading.notFound', 'Article not found.')}</p>
        <button type="button" className={styles['backBtnLarge']} onClick={handleBack}>
          <ArrowLeft size={15} /> {t('reading.backToList', 'Back to Readings')}
        </button>
      </div>
    );
  }

  const levelColor = getLevelColor(article.level);
  const questions = (article.questions ?? []) as Question[];
  const vocabulary = (article.vocabulary ?? []) as VocabularyEmbedded[];

  return (
    <div className={styles['readerPage']}>
      <div
        className={styles['progressRibbon']}
        style={{ width: `${scrollPct}%`, background: levelColor }}
      />

      <header className={styles['readerHeader']}>
        <button type="button" className={styles['backBtn']} onClick={handleBack}>
          <ArrowLeft size={16} />
          <span>{t('reading.backToList', 'Back')}</span>
        </button>

        <div className={styles['headerCenter']}>
          <span className={styles['headerTitle']}>{article.title}</span>
        </div>

        <div className={styles['headerRight']}>
          <span className={styles['levelChip']} style={{ background: levelColor }}>
            {LEVEL_DISPLAY[article.level] ?? article.level}
          </span>
          <span className={styles['metaChip']}>
            <Clock size={11} />
            {article.estimatedMinutes} min
          </span>
          <span className={styles['metaChip']}>
            <AlignLeft size={11} />
            {article.wordCount}
          </span>
        </div>
      </header>

      <main className={styles['articleWrap']} ref={articleRef}>
        <div className={styles['articleInner']}>
          <div className={styles['articleMeta']}>
            <span className={styles['articleTopic']} style={{ color: levelColor }}>
              {article.topic}
            </span>
          </div>

          {/* КОНТЕЙНЕР ДЛЯ ЗАГОЛОВКА И КНОПКИ ЗАКЛАДОК */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', margin: '0.5rem 0 1.5rem 0' }}>
            <h1 className={styles['articleTitle']} style={{ margin: 0 }}>{article.title}</h1>
            <BookmarkButton 
              targetId={article.id} 
              type={"READING" as any} 
              size="md" 
            />
          </div>

          {article.description !== undefined && (
            <p className={styles['articleLead']}>{article.description}</p>
          )}

          <div className={styles['articleDivider']} style={{ background: levelColor }} />

          <ArticleContent content={article.content} vocabulary={vocabulary} />

          {article.tags.length > 0 && (
            <div className={styles['tagRow']}>
              {article.tags.map((tag) => (
                <span key={tag} className={styles['tag']}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          <VocabPanel vocabulary={vocabulary} />

          {questions.length > 0 && <QuizSection questions={questions} materialId={article.id} />}
        </div>
      </main>
    </div>
  );
}