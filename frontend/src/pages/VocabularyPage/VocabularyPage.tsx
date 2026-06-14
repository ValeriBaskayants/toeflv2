import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Search,
  Layers,
  Volume2,
  ChevronRight,
  Flame,
  Trophy,
  RotateCcw,
  Star,
  Zap,
  Brain,
  Filter,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Eye,
  Lightbulb,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { selectUser } from '@/store/Slices/AuthSlice';
import {
  fetchFlashcards,
  fetchWordList,
  fetchVocabProgress,
  reviewWord as reviewWordThunk,
  selectFlashcards,
  selectFlashcardsStatus,
  selectFlashcardsError,
  selectWordList,
  selectWordListStatus,
  selectVocabProgress,
  selectReviewStatus,
  clearFlashcards,
} from '@/store/Slices/VocabularySlice';
import { BookmarkButton } from '@/components/layout/BookmarkButton/BookmarkButton';
import type { VocabularyWord, SM2Quality } from '@/types/vocabulary/Vocabulary';
import { Level, PartOfSpeech, WordLearningStatus } from '@/types/globalTypes';
import styles from './VocabularyPage.module.css';

// ─── Constants (stable across locales) ──────────────────────────────────────

const LEVEL_ORDER: Level[] = [
  Level.A1, Level.A1_PLUS, Level.A2, Level.A2_PLUS,
  Level.B1, Level.B1_PLUS, Level.B2, Level.B2_PLUS,
  Level.C1, Level.C2,
];

const LEVEL_DISPLAY: Record<Level, string> = {
  A1: 'A1', A1_PLUS: 'A1+', A2: 'A2', A2_PLUS: 'A2+',
  B1: 'B1', B1_PLUS: 'B1+', B2: 'B2', B2_PLUS: 'B2+',
  C1: 'C1', C2: 'C2',
};

const LEVEL_COLOR: Record<Level, string> = {
  A1: '#22c55e', A1_PLUS: '#16a34a', A2: '#14b8a6', A2_PLUS: '#0d9488',
  B1: '#3b82f6', B1_PLUS: '#2563eb', B2: '#6366f1', B2_PLUS: '#4f46e5',
  C1: '#8b5cf6', C2: '#a855f7',
};

const STATUS_COLOR: Record<WordLearningStatus, { color: string; bg: string }> = {
  NEW:      { color: '#64748b', bg: '#64748b18' },
  LEARNING: { color: '#3b82f6', bg: '#3b82f618' },
  REVIEW:   { color: '#f59e0b', bg: '#f59e0b18' },
  MASTERED: { color: '#22c55e', bg: '#22c55e18' },
};

// SM-2 quality values are fixed — only labels/hints are translated
const RATING_QUALITIES: Array<{ quality: SM2Quality; key: string; color: string; i18nKey: string; hintKey: string }> = [
  { quality: 0, key: '1', color: '#ef4444', i18nKey: 'flashcard.again', hintKey: 'flashcard.hintAgain' },
  { quality: 2, key: '2', color: '#f97316', i18nKey: 'flashcard.hard',  hintKey: 'flashcard.hintHard'  },
  { quality: 3, key: '3', color: '#3b82f6', i18nKey: 'flashcard.good',  hintKey: 'flashcard.hintGood'  },
  { quality: 5, key: '4', color: '#22c55e', i18nKey: 'flashcard.easy',  hintKey: 'flashcard.hintEasy'  },
];

// ─── Hint config ─────────────────────────────────────────────────────────────

interface HintConfig {
  autoRevealMs: number | null;
  showRussian: boolean;
  showWordShape: boolean;
  hintTimerProgressShow: boolean;
}

function getHintConfig(userLevel: Level, wordLevel: Level): HintConfig {
  const uIdx = LEVEL_ORDER.indexOf(userLevel);
  const wIdx = LEVEL_ORDER.indexOf(wordLevel);
  const gap  = wIdx - uIdx;

  if (uIdx <= 2) {
    return { autoRevealMs: 4000, showRussian: true, showWordShape: true, hintTimerProgressShow: true };
  }
  if (uIdx <= 5) {
    return {
      autoRevealMs: gap > 1 ? 6000 : 10000,
      showRussian: gap > 2,
      showWordShape: gap >= 0,
      hintTimerProgressShow: true,
    };
  }
  return {
    autoRevealMs: gap > 3 ? 12000 : null,
    showRussian: false,
    showWordShape: gap > 2,
    hintTimerProgressShow: false,
  };
}

function buildWordShape(word: string): string {
  if (word.length <= 2) return word;
  const first = word[0] ?? '';
  const last  = word[word.length - 1] ?? '';
  const blanks = '_ '.repeat(word.length - 2).trim();
  return `${first} ${blanks} ${last}`;
}

// ─── Small shared components ─────────────────────────────────────────────────

function LevelBadge({ level }: { level: Level }) {
  const color = LEVEL_COLOR[level] ?? '#6366f1';
  return (
    <span className={styles['levelBadge']} style={{ '--badge-color': color } as CSSProperties}>
      {LEVEL_DISPLAY[level]}
    </span>
  );
}

function StatusBadge({ status }: { status: WordLearningStatus }) {
  const { t } = useTranslation('vocabulary');
  const cfg = STATUS_COLOR[status];
  return (
    <span
      className={styles['statusBadge']}
      style={{ '--status-color': cfg.color, '--status-bg': cfg.bg } as CSSProperties}
    >
      {t(`status.${status}`)}
    </span>
  );
}

function PosBadge({ type }: { type: PartOfSpeech }) {
  const { t } = useTranslation('vocabulary');
  return <span className={styles['posBadge']}>{t(`pos.${type}`)}</span>;
}

// ─── SVG progress ring ────────────────────────────────────────────────────────

function CircleProgress({ pct, color, size = 52 }: { pct: number; color: string; size?: number }) {
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={3} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  );
}

// ─── Progress strip ───────────────────────────────────────────────────────────

function ProgressHeader() {
  const { t } = useTranslation('vocabulary');
  const progress = useAppSelector(selectVocabProgress);
  if (progress === null) return null;

  const learnedPct  = progress.total > 0 ? Math.round((progress.learned  / progress.total) * 100) : 0;
  const masteredPct = progress.total > 0 ? Math.round((progress.mastered / progress.total) * 100) : 0;

  return (
    <div className={styles['progressStrip']}>
      <div className={styles['progressRingWrap']}>
        <CircleProgress pct={learnedPct} color="#6366f1" size={52} />
        <span className={styles['progressRingLabel']}>{learnedPct}%</span>
      </div>

      <div className={styles['progressStats']}>
        <div className={styles['progressStat']}>
          <Brain size={13} className={styles['statIconNeutral']} />
          <span className={styles['statNum']}>{progress.total.toLocaleString()}</span>
          <span className={styles['statLabel']}>{t('progress.total')}</span>
        </div>
        <div className={styles['progressStatDivider']} />
        <div className={styles['progressStat']}>
          <Zap size={13} className={styles['statIconBlue']} />
          <span className={`${styles['statNum']} ${styles['statNumBlue']}`}>{progress.learned}</span>
          <span className={styles['statLabel']}>{t('progress.learned')}</span>
        </div>
        <div className={styles['progressStatDivider']} />
        <div className={styles['progressStat']}>
          <Trophy size={13} className={styles['statIconGreen']} />
          <span className={`${styles['statNum']} ${styles['statNumGreen']}`}>{progress.mastered}</span>
          <span className={styles['statLabel']}>{t('progress.mastered')}</span>
        </div>
        {progress.dueToday > 0 && (
          <>
            <div className={styles['progressStatDivider']} />
            <div className={`${styles['progressStat']} ${styles['progressStatDue']}`}>
              <Flame size={13} />
              <span className={styles['statNum']}>{progress.dueToday}</span>
              <span className={styles['statLabel']}>{t('progress.due')}</span>
            </div>
          </>
        )}
      </div>

      <div className={styles['progressBarCol']}>
        <div className={styles['progressBarRow']}>
          <span className={styles['progressBarLabelSmall']}>{t('progress.learned')}</span>
          <div className={styles['progressBar']}>
            <div className={styles['progressBarFillBlue']} style={{ width: `${learnedPct}%` }} />
          </div>
          <span className={styles['progressBarPct']}>{learnedPct}%</span>
        </div>
        <div className={styles['progressBarRow']}>
          <span className={styles['progressBarLabelSmall']}>{t('progress.mastered')}</span>
          <div className={styles['progressBar']}>
            <div className={styles['progressBarFillGreen']} style={{ width: `${masteredPct}%` }} />
          </div>
          <span className={styles['progressBarPct']}>{masteredPct}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Flashcard ────────────────────────────────────────────────────────────────

interface FlashcardViewProps {
  word: VocabularyWord;
  status: WordLearningStatus;
  userLevel: Level;
  cardIndex: number;
  totalCards: number;
  onRate: (quality: SM2Quality) => void;
  isReviewing: boolean;
}

function FlashcardView({ word, status, userLevel, cardIndex, totalCards, onRate, isReviewing }: FlashcardViewProps) {
  const { t } = useTranslation('vocabulary');
  const [phase, setPhase]       = useState<'question' | 'answer'>('question');
  const [hintVisible, setHintVisible] = useState(false);
  const [timerPct, setTimerPct] = useState(100);
  const [ratedKey, setRatedKey] = useState<SM2Quality | null>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRevealRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const config = getHintConfig(userLevel, word.level);

  // Reset on card change
  useEffect(() => {
    setPhase('question');
    setHintVisible(false);
    setTimerPct(100);
    setRatedKey(null);

    if (timerRef.current !== null)      clearInterval(timerRef.current);
    if (autoRevealRef.current !== null) clearTimeout(autoRevealRef.current);

    if (config.autoRevealMs !== null) {
      const totalMs  = config.autoRevealMs;
      const stepMs   = 80;
      const stepSize = (stepMs / totalMs) * 100;

      timerRef.current = setInterval(() => {
        setTimerPct((prev) => Math.max(0, prev - stepSize));
      }, stepMs);

      autoRevealRef.current = setTimeout(() => {
        setHintVisible(true);
        if (timerRef.current !== null) clearInterval(timerRef.current);
        setTimerPct(0);
      }, totalMs);
    }

    return () => {
      if (timerRef.current !== null)      clearInterval(timerRef.current);
      if (autoRevealRef.current !== null) clearTimeout(autoRevealRef.current);
    };
  }, [cardIndex]);

  const handleShowHint = useCallback(() => {
    setHintVisible(true);
    if (timerRef.current !== null)      clearInterval(timerRef.current);
    if (autoRevealRef.current !== null) clearTimeout(autoRevealRef.current);
    setTimerPct(0);
  }, []);

  const handleReveal = useCallback(() => {
    setPhase('answer');
    setHintVisible(false);
    if (timerRef.current !== null)      clearInterval(timerRef.current);
    if (autoRevealRef.current !== null) clearTimeout(autoRevealRef.current);
  }, []);

  const handleRate = useCallback((quality: SM2Quality) => {
    if (isReviewing) return;
    setRatedKey(quality);
    setTimeout(() => onRate(quality), 180);
  }, [isReviewing, onRate]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (phase === 'question') {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleReveal(); }
        if (e.key === 'h' || e.key === 'H')     handleShowHint();
      } else {
        const r = RATING_QUALITIES.find((q) => q.key === e.key);
        if (r !== undefined && !isReviewing) handleRate(r.quality);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, isReviewing, handleReveal, handleShowHint, handleRate]);

  const levelColor  = LEVEL_COLOR[word.level] ?? '#6366f1';
  const isNew       = status === WordLearningStatus.NEW;
  const progressPct = totalCards > 0 ? Math.round((cardIndex / totalCards) * 100) : 0;

  return (
    <div className={styles['studyWrap']}>
      {/* Session bar */}
      <div className={styles['sessionProgressWrap']}>
        <div className={styles['sessionProgressBar']}>
          <div
            className={styles['sessionProgressFill']}
            style={{ width: `${progressPct}%`, '--session-color': levelColor } as CSSProperties}
          />
        </div>
        <div className={styles['sessionMeta']}>
          <span className={styles['sessionCounter']}>{cardIndex + 1} / {totalCards}</span>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Dot trail */}
      <div className={styles['cardDots']} role="list" aria-label={t('flashcard.cardProgress')}>
        {Array.from({ length: Math.min(totalCards, 10) }, (_, i) => (
          <div
            key={i}
            className={`${styles['cardDot']} ${i < cardIndex ? styles['cardDotDone'] : ''} ${i === cardIndex ? styles['cardDotActive'] : ''}`}
            style={i === cardIndex ? ({ '--dot-color': levelColor } as CSSProperties) : undefined}
          />
        ))}
        {totalCards > 10 && <span className={styles['dotsOverflow']}>+{totalCards - 10}</span>}
      </div>

      {/* Card */}
      <div
        className={`${styles['flashcard']} ${phase === 'answer' ? styles['flashcardRevealed'] : ''}`}
        style={{ '--level-color': levelColor } as CSSProperties}
      >
        <div className={styles['cardStripe']} />

        <div className={styles['cardHeader']}>
          <div className={styles['cardBadges']}>
            <LevelBadge level={word.level} />
            <PosBadge type={word.type} />
            {word.isIrregularVerb && (
              <span className={styles['irregularBadge']}>{t('badge.irregular')}</span>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <BookmarkButton targetId={word.id} type="VOCABULARY" size="sm" />
          </div>
        </div>

        <div className={styles['wordDisplay']}>
          <h2 className={styles['wordText']}>{word.word}</h2>
          {word.pronunciation.length > 0 && (
            <button
              type="button"
              className={styles['pronunciationBtn']}
              aria-label={`${t('pronunciation')}: ${word.pronunciation}`}
            >
              <Volume2 size={14} />
              <span>/{word.pronunciation}/</span>
            </button>
          )}
        </div>

        {/* ── QUESTION PHASE ── */}
        {phase === 'question' && (
          <div className={styles['questionPhase']}>
            {config.hintTimerProgressShow && !hintVisible && config.autoRevealMs !== null && (
              <div className={styles['timerTrack']}>
                <div
                  className={styles['timerFill']}
                  style={{ width: `${timerPct}%`, transition: timerPct === 100 ? 'none' : 'width 0.08s linear' }}
                />
              </div>
            )}

            {hintVisible ? (
              <div className={styles['hintReveal']}>
                {config.showWordShape && (
                  <div className={styles['wordShape']}>
                    {buildWordShape(word.word).split(' ').map((ch, i) => (
                      <span key={i} className={ch === '_' ? styles['blankChar'] : styles['letterChar']}>
                        {ch}
                      </span>
                    ))}
                    <span className={styles['wordLength']}>({word.word.length} {t('letters')})</span>
                  </div>
                )}
                {config.showRussian && word.definitionRu.length > 0 && (
                  <p className={styles['hintRu']}>{word.definitionRu}</p>
                )}
              </div>
            ) : (
              !isNew && config.autoRevealMs === null && (
                <button type="button" className={styles['hintBtn']} onClick={handleShowHint}>
                  <Lightbulb size={14} />
                  {t('flashcard.showHint')}
                  <kbd className={styles['kbdPill']}>H</kbd>
                </button>
              )
            )}

            <button type="button" className={styles['revealBtn']} onClick={handleReveal}>
              <Eye size={16} />
              {t('flashcard.showAnswer')}
              <kbd className={styles['kbdPill']}>Space</kbd>
            </button>
          </div>
        )}

        {/* ── ANSWER PHASE ── */}
        {phase === 'answer' && (
          <div className={styles['answerPhase']}>
            <div className={styles['definitionBlock']}>
              <p className={styles['definition']}>{word.definition}</p>
              {config.showRussian && word.definitionRu.length > 0 && (
                <p className={styles['definitionRu']}>{word.definitionRu}</p>
              )}
            </div>

            {word.type === PartOfSpeech.VERB && word.forms !== undefined && (
              <div className={styles['formsRow']}>
                {word.forms.past !== undefined && (
                  <span className={styles['formChip']}>
                    <span className={styles['formRole']}>{t('forms.past')}</span>
                    {word.forms.past}
                  </span>
                )}
                {word.forms.pastParticiple !== undefined && (
                  <span className={styles['formChip']}>
                    <span className={styles['formRole']}>{t('forms.pp')}</span>
                    {word.forms.pastParticiple}
                  </span>
                )}
                {word.forms.thirdPerson !== undefined && (
                  <span className={styles['formChip']}>
                    <span className={styles['formRole']}>{t('forms.third')}</span>
                    {word.forms.thirdPerson}
                  </span>
                )}
                {word.forms.presentParticiple !== undefined && (
                  <span className={styles['formChip']}>
                    <span className={styles['formRole']}>{t('forms.ing')}</span>
                    {word.forms.presentParticiple}
                  </span>
                )}
              </div>
            )}

            {word.examples.length > 0 && (
              <div className={styles['examplesBlock']}>
                {word.examples.slice(0, 2).map((ex, i) => (
                  <blockquote key={i} className={styles['example']}>"{ex}"</blockquote>
                ))}
              </div>
            )}

            {(word.synonyms.length > 0 || word.antonyms.length > 0) && (
              <div className={styles['relatedBlock']}>
                {word.synonyms.length > 0 && (
                  <div className={styles['relatedRow']}>
                    <span className={styles['relatedSym']}>≈</span>
                    <span className={styles['relatedWords']}>{word.synonyms.slice(0, 5).join(' · ')}</span>
                  </div>
                )}
                {word.antonyms.length > 0 && (
                  <div className={styles['relatedRow']}>
                    <span className={`${styles['relatedSym']} ${styles['antonymSym']}`}>≠</span>
                    <span className={styles['relatedWords']}>{word.antonyms.slice(0, 5).join(' · ')}</span>
                  </div>
                )}
              </div>
            )}

            <div className={styles['ratingSection']}>
              <p className={styles['ratingPrompt']}>{t('flashcard.howWell')}</p>
              <div className={styles['ratingGrid']}>
                {RATING_QUALITIES.map(({ quality, key, color, i18nKey, hintKey }) => (
                  <button
                    key={quality}
                    type="button"
                    disabled={isReviewing}
                    className={`${styles['ratingBtn']} ${ratedKey === quality ? styles['ratingBtnSelected'] : ''}`}
                    style={{ '--rating-color': color } as CSSProperties}
                    onClick={() => handleRate(quality)}
                  >
                    <span className={styles['ratingLabel']}>{t(i18nKey)}</span>
                    <span className={styles['ratingSubtext']}>{t(hintKey)}</span>
                    <kbd className={styles['ratingKbdInline']}>{key}</kbd>
                  </button>
                ))}
              </div>
              <p className={styles['kbdHintText']}>{t('flashcard.kbdRateHint')}</p>
            </div>
          </div>
        )}
      </div>

      {phase === 'question' && (
        <p className={styles['navHint']}>
          <kbd className={styles['kbdInline']}>Space</kbd> {t('flashcard.kbdReveal')}
          {!isNew && config.autoRevealMs === null && (
            <> · <kbd className={styles['kbdInline']}>H</kbd> {t('flashcard.kbdHint')}</>
          )}
        </p>
      )}
    </div>
  );
}

// ─── Session complete ─────────────────────────────────────────────────────────

function SessionComplete({ total, onRestart }: { total: number; onRestart: () => void }) {
  const { t } = useTranslation('vocabulary');
  return (
    <div className={styles['sessionComplete']}>
      <div className={styles['completeBurst']}><Sparkles size={32} /></div>
      <h2 className={styles['completeTitle']}>{t('flashcard.sessionDone')}</h2>
      <p className={styles['completeText']}>
        {t('flashcard.sessionText', { count: total, plural: total !== 1 ? 's' : '' })}
      </p>
      <button type="button" className={styles['restartBtn']} onClick={onRestart}>
        <RotateCcw size={14} />
        {t('flashcard.studyMore')}
      </button>
    </div>
  );
}

// ─── All caught up ────────────────────────────────────────────────────────────

function AllCaughtUp() {
  const { t } = useTranslation('vocabulary');
  return (
    <div className={styles['allCaughtUp']}>
      <div className={styles['caughtUpIcon']}><CheckCircle2 size={36} /></div>
      <h2 className={styles['completeTitle']}>{t('flashcard.allCaughtUp')}</h2>
      <p className={styles['completeText']}>{t('flashcard.allCaughtUpText')}</p>
    </div>
  );
}

// ─── Mastered toast ───────────────────────────────────────────────────────────

function MasteredToast() {
  const { t } = useTranslation('vocabulary');
  return (
    <div className={styles['masteredToast']}>
      <Star size={14} />
      {t('flashcard.mastered')} 🎉
    </div>
  );
}

// ─── Study mode ───────────────────────────────────────────────────────────────

function StudyMode() {
  const { t } = useTranslation('vocabulary');
  const dispatch     = useAppDispatch();
  const user         = useAppSelector(selectUser);
  const flashcards   = useAppSelector(selectFlashcards);
  const status       = useAppSelector(selectFlashcardsStatus);
  const error        = useAppSelector(selectFlashcardsError);
  const reviewStatus = useAppSelector(selectReviewStatus);

  const [cardIndex,    setCardIndex]    = useState(0);
  const [sessionDone,  setSessionDone]  = useState(false);
  const [justMastered, setJustMastered] = useState(false);

  const userLevel = (user?.currentLevel as Level | undefined) ?? Level.A1;

  useEffect(() => {
    if (status === 'idle') void dispatch(fetchFlashcards({ limit: 20 }));
  }, [status, dispatch]);

  const handleRate = useCallback(async (quality: SM2Quality) => {
    const current = flashcards[cardIndex];
    if (current === undefined) return;

    const result = await dispatch(reviewWordThunk({ wordId: current.word.id, quality }));

    if (reviewWordThunk.fulfilled.match(result) && result.payload.justMastered) {
      setJustMastered(true);
      setTimeout(() => setJustMastered(false), 2400);
    }

    const next = cardIndex + 1;
    if (next >= flashcards.length) {
      setSessionDone(true);
    } else {
      setCardIndex(next);
    }
  }, [cardIndex, flashcards, dispatch]);

  const handleRestart = useCallback(() => {
    dispatch(clearFlashcards());
    setCardIndex(0);
    setSessionDone(false);
    setJustMastered(false);
  }, [dispatch]);

  if (status === 'loading') {
    return (
      <div className={styles['loadingState']}>
        <div className={styles['loadingPulse']} />
        <div className={styles['loadingPulse']} style={{ animationDelay: '0.15s' }} />
        <div className={styles['loadingPulse']} style={{ animationDelay: '0.3s' }} />
        <p className={styles['loadingText']}>{t('loading')}</p>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className={styles['errorState']}>
        <AlertCircle size={28} />
        <p>{t('error')}</p>
        <button type="button" className={styles['retryBtn']} onClick={handleRestart}>
          {t('retry')}
        </button>
      </div>
    );
  }

  if (flashcards.length === 0 && status === 'success') return <AllCaughtUp />;
  if (sessionDone) return <SessionComplete total={flashcards.length} onRestart={handleRestart} />;

  const current    = flashcards[cardIndex];
  if (current === undefined) return null;

  const cardStatus = (current.progress?.status ?? WordLearningStatus.NEW) as WordLearningStatus;

  return (
    <>
      {justMastered && <MasteredToast />}
      <FlashcardView
        word={current.word}
        status={cardStatus}
        userLevel={userLevel}
        cardIndex={cardIndex}
        totalCards={flashcards.length}
        onRate={handleRate}
        isReviewing={reviewStatus === 'loading'}
      />
    </>
  );
}

// ─── Word card (browse) ───────────────────────────────────────────────────────

function WordCard({ word }: { word: VocabularyWord }) {
  const { t }   = useTranslation('vocabulary');
  const [expanded, setExpanded] = useState(false);
  const color   = LEVEL_COLOR[word.level as Level] ?? '#6366f1';

  const toggle    = useCallback(() => setExpanded((p) => !p), []);
  const handleKey = useCallback((e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  }, [toggle]);

  return (
    <article
      className={`${styles['wordCard']} ${expanded ? styles['wordCardOpen'] : ''}`}
      style={{ '--card-color': color } as CSSProperties}
      onClick={toggle}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={handleKey}
    >
      <div className={styles['wordCardAccent']} />

      <div className={styles['wordCardRow']}>
        <div className={styles['wordCardLeft']}>
          <span className={styles['wordCardWord']}>{word.word}</span>
          {word.pronunciation.length > 0 && (
            <span className={styles['wordCardPron']}>/{word.pronunciation}/</span>
          )}
        </div>
        <div className={styles['wordCardRight']}>
          <LevelBadge level={word.level} />
          <PosBadge type={word.type} />
          {word.isIrregularVerb && (
            <span className={styles['wordCardIrreg']}>{t('badge.irregular')}</span>
          )}
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <BookmarkButton targetId={word.id} type="VOCABULARY" size="sm" />
          </div>
          <ChevronRight
            size={15}
            className={`${styles['wordCardChevron']} ${expanded ? styles['wordCardChevronOpen'] : ''}`}
          />
        </div>
      </div>

      {expanded && (
        <div className={styles['wordCardExpanded']}>
          <p className={styles['wordCardDef']}>{word.definition}</p>
          {word.definitionRu.length > 0 && (
            <p className={styles['wordCardDefRu']}>{word.definitionRu}</p>
          )}
          {word.examples.length > 0 && (
            <blockquote className={styles['wordCardExample']}>"{word.examples[0]}"</blockquote>
          )}
          {word.synonyms.length > 0 && (
            <p className={styles['wordCardSynonyms']}>
              <span className={styles['relatedChip']}>≈</span>
              {word.synonyms.slice(0, 5).join(' · ')}
            </p>
          )}
          {word.forms !== undefined && word.type === PartOfSpeech.VERB && (
            <div className={styles['wordCardForms']}>
              {word.forms.past !== undefined && (
                <span className={styles['formChipSm']}>
                  <span className={styles['formRole']}>{t('forms.past')}</span>
                  {word.forms.past}
                </span>
              )}
              {word.forms.pastParticiple !== undefined && (
                <span className={styles['formChipSm']}>
                  <span className={styles['formRole']}>{t('forms.pp')}</span>
                  {word.forms.pastParticiple}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Browse mode ──────────────────────────────────────────────────────────────

function BrowseMode() {
  const { t }        = useTranslation('vocabulary');
  const dispatch     = useAppDispatch();
  const wordList     = useAppSelector(selectWordList);
  const wordListStatus = useAppSelector(selectWordListStatus);

  const [search,      setSearch]      = useState('');
  const [level,       setLevel]       = useState<Level | null>(null);
  const [pos,         setPos]         = useState<PartOfSpeech | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = {
      limit: 100,
      ...(level !== null              ? { level }               : {}),
      ...(pos !== null                ? { type: pos }           : {}),
      ...(search.trim().length > 0   ? { search: search.trim() } : {}),
    };
    void dispatch(fetchWordList(params));
  }, [dispatch, level, pos, search]);

  const activeFilterCount = [level, pos].filter(Boolean).length;

  return (
    <div className={styles['browseWrap']}>
      <div className={styles['browseToolbar']}>
        <div className={styles['searchWrap']}>
          <Search size={15} className={styles['searchIcon']} />
          <input
            ref={searchRef}
            type="search"
            className={styles['searchInput']}
            placeholder={t('browse.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('browse.search')}
          />
          {search.length > 0 && (
            <button
              type="button"
              className={styles['searchClearBtn']}
              onClick={() => { setSearch(''); searchRef.current?.focus(); }}
              aria-label={t('browse.clearSearch')}
            >
              <X size={12} />
            </button>
          )}
        </div>

        <button
          type="button"
          className={`${styles['filterToggle']} ${showFilters || activeFilterCount > 0 ? styles['filterToggleActive'] : ''}`}
          onClick={() => setShowFilters((p) => !p)}
          aria-expanded={showFilters}
        >
          <Filter size={14} />
          {t('browse.filters')}
          {activeFilterCount > 0 && (
            <span className={styles['filterCount']}>{activeFilterCount}</span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className={styles['filterPanel']}>
          <div className={styles['filterGroup']}>
            <span className={styles['filterLabel']}>{t('browse.level')}</span>
            <div className={styles['filterPills']}>
              <button
                type="button"
                className={`${styles['filterPill']} ${level === null ? styles['filterPillActive'] : ''}`}
                onClick={() => setLevel(null)}
              >
                {t('browse.all')}
              </button>
              {LEVEL_ORDER.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`${styles['filterPill']} ${level === l ? styles['filterPillActive'] : ''}`}
                  style={level === l ? ({ '--pill-color': LEVEL_COLOR[l] } as CSSProperties) : undefined}
                  onClick={() => setLevel(level === l ? null : l)}
                >
                  {LEVEL_DISPLAY[l]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles['filterGroup']}>
            <span className={styles['filterLabel']}>{t('browse.partOfSpeech')}</span>
            <div className={styles['filterPills']}>
              <button
                type="button"
                className={`${styles['filterPill']} ${pos === null ? styles['filterPillActive'] : ''}`}
                onClick={() => setPos(null)}
              >
                {t('browse.all')}
              </button>
              {Object.values(PartOfSpeech).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`${styles['filterPill']} ${pos === p ? styles['filterPillActive'] : ''}`}
                  onClick={() => setPos(pos === p ? null : p)}
                >
                  {t(`pos.${p}`)}
                </button>
              ))}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              className={styles['clearFiltersBtn']}
              onClick={() => { setLevel(null); setPos(null); }}
            >
              <X size={12} /> {t('browse.clearFilters')}
            </button>
          )}
        </div>
      )}

      {wordListStatus === 'success' && (
        <p className={styles['browseCount']}>
          <span className={styles['browseCountNum']}>{wordList.length}</span>
          {' '}
          {search.length > 0
            ? t('browse.countFiltered', { count: wordList.length, plural: wordList.length !== 1 ? 's' : '', query: search })
            : t('browse.count', { count: wordList.length, plural: wordList.length !== 1 ? 's' : '' })}
        </p>
      )}

      {wordListStatus === 'loading' ? (
        <div className={styles['browseLoading']}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={styles['skeletonRow']} style={{ animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
      ) : wordList.length === 0 ? (
        <div className={styles['browseEmpty']}>
          <BookOpen size={36} className={styles['browseEmptyIcon']} />
          <p className={styles['browseEmptyTitle']}>{t('browse.noResults')}</p>
          <p className={styles['browseEmptyText']}>
            {search.length > 0
              ? t('browse.noResultsSearch', { query: search })
              : t('browse.noResultsFilters')}
          </p>
        </div>
      ) : (
        <div className={styles['wordList']}>
          {wordList.map((word) => <WordCard key={word.id} word={word} />)}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageMode = 'study' | 'browse';

export function VocabularyPage() {
  const { t }    = useTranslation('vocabulary');
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<PageMode>('study');

  useEffect(() => {
    void dispatch(fetchVocabProgress());
  }, [dispatch]);

  return (
    <div className={styles['page']}>
      <header className={styles['pageHeader']}>
        <div className={styles['pageHeaderLeft']}>
          <div className={styles['pageIcon']}><Layers size={20} /></div>
          <div>
            <h1 className={styles['pageTitle']}>{t('title')}</h1>
            <p className={styles['pageSubtitle']}>{t('subtitle')}</p>
          </div>
        </div>
      </header>

      <ProgressHeader />

      <div className={styles['modeSwitcher']} role="tablist" aria-label={t('modeLabel')}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'study'}
          className={`${styles['modeTab']} ${mode === 'study' ? styles['modeTabActive'] : ''}`}
          onClick={() => setMode('study')}
        >
          <Brain size={15} />
          {t('study')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'browse'}
          className={`${styles['modeTab']} ${mode === 'browse' ? styles['modeTabActive'] : ''}`}
          onClick={() => setMode('browse')}
        >
          <BookOpen size={15} />
          {t('browse')}
        </button>
      </div>

      <div className={styles['content']}>
        {mode === 'study' ? <StudyMode /> : <BrowseMode />}
      </div>
    </div>
  );
}