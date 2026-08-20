
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
  SortableContext,
  useSortable,
   rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle2, XCircle, Lightbulb, ArrowRight, X, Trophy } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { loadQueueItem, submitCurrentAnswer, advanceQueue, resetSession } from '@/store/Slices/ScrambleSlice';
import { getHintPolicy, HINT_AUTO_HIDE_MS } from '@/constants/scramble-hints';
import { FullPageSpinner } from '@/components/ui/Spinner';
import type { ScrambleWordOption } from '@/types/scramble/Scramble.types';
import styles from './ScrambleSession.module.css';

const ROLE_COLOR: Record<string, string> = {
  SUBJECT: '#6366f1', VERB: '#ef4444', OBJECT: '#f59e0b', ADJECTIVE: '#22c55e',
  ADVERB: '#06b6d4', PREPOSITION: '#a855f7', CONJUNCTION: '#ec4899',
  DETERMINER: '#84cc16', COMPLEMENT: '#f97316', OTHER: '#71717a',
};


type SortableHandle = ReturnType<typeof useSortable>;

interface WordChipViewProps {
  word: string;
  isDistractor: boolean;
  revealedRole: string | undefined;
  isCorrectness: 'correct' | 'incorrect' | undefined;
  isDragging?: boolean | undefined;
  onWordClick?: (() => void) | undefined;
  style?: React.CSSProperties | undefined;
  setNodeRef?: SortableHandle['setNodeRef'] | undefined;
  attributes?: SortableHandle['attributes'] | undefined;
  listeners?: SortableHandle['listeners'] | undefined;
}

function WordChipView({
  word, isDistractor, revealedRole, isCorrectness, isDragging, onWordClick,
  style, setNodeRef, attributes, listeners,
}: WordChipViewProps) {
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={[
        styles['chip'],
        isDistractor ? styles['chipDistractor'] : '',
        isCorrectness === 'correct' ? styles['chipCorrect'] : '',
        isCorrectness === 'incorrect' ? styles['chipIncorrect'] : '',
        isDragging === true ? styles['chipDragging'] : '',
      ].join(' ')}
      onClick={(e) => { e.stopPropagation(); onWordClick?.(); }}
    >
      <span>{word}</span>
      {revealedRole !== undefined && (
        <span className={styles['roleTag']} style={{ '--role-color': ROLE_COLOR[revealedRole] } as React.CSSProperties}>
          {revealedRole.toLowerCase()}
        </span>
      )}
    </div>
  );
}

interface SortableWordChipProps {
  id: string;
  word: string;
  isDistractor: boolean;
  revealedRole: string | undefined;
  isCorrectness: 'correct' | 'incorrect' | undefined;
  onWordClick: () => void;
}

function SortableWordChip({ id, word, isDistractor, revealedRole, isCorrectness, onWordClick }: SortableWordChipProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id });

  return (
    <WordChipView
      word={word}
      isDistractor={isDistractor}
      revealedRole={revealedRole}
      isCorrectness={isCorrectness}
      isDragging={isDragging}
      onWordClick={onWordClick}
      setNodeRef={setNodeRef}
      attributes={attributes}
      listeners={listeners}
      style={{ transform: CSS.Transform.toString(transform), transition: transition ?? undefined, opacity: isDragging ? 0.35 : 1 }}
    />
  );
}

interface DroppableZoneProps {
  id: 'bank' | 'line';
  children: React.ReactNode;
  isEmpty: boolean;
  placeholder: string;
}

function DroppableZone({ id, children, isEmpty, placeholder }: DroppableZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${styles['dropZone']} ${isOver ? styles['dropZoneOver'] : ''}`}>
      {isEmpty && <span className={styles['dropPlaceholder']}>{placeholder}</span>}
      {children}
    </div>
  );
}

const SESSION_LIST_PATH = '/writing/scramble';

export default function ScrambleSessionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    queue, queueIndex, currentExercise, exerciseLoading, lastResult, submitting, mistakes, completed,
  } = useAppSelector((s) => s.scramble);

  const currentItem = queue[queueIndex];

  const [bank, setBank] = useState<string[]>([]);
  const [line, setLine] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [usedHint, setUsedHint] = useState(false);
  const [autoHintVisible, setAutoHintVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleSubmit = useCallback(async () => {
    if (lastResult !== null || line.length === 0) return;
    await dispatch(submitCurrentAnswer({ wordOrder: line, usedHint }));
  }, [dispatch, lastResult, line, usedHint]);

  
  useEffect(() => {
    if (queue.length === 0) {
      navigate(SESSION_LIST_PATH, { replace: true });
    }
  }, [queue.length, navigate]);

  
  useEffect(() => {
    if (currentItem !== undefined && (currentExercise === null || currentExercise.id !== currentItem.id)) {
      void dispatch(loadQueueItem(currentItem));
    }
  }, [currentItem, currentExercise, dispatch]);

  
  useEffect(() => {
    if (currentExercise !== null) {
      setBank(currentExercise.words.map((w) => w.id));
      setLine([]);
      setRevealed(new Set());
      setUsedHint(false);
      setAutoHintVisible(false);
      setTimeLeft(currentExercise.timeLimitSec);
    }
  }, [currentExercise]);

  
  useEffect(() => {
    if (timeLeft === null || lastResult !== null) {
      return undefined;
    }

    if (timeLeft <= 0) {
      void handleSubmit();
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [timeLeft, lastResult, handleSubmit]);

  const wordMap = useMemo(() => {
    const map = new Map<string, ScrambleWordOption>();
    currentExercise?.words.forEach((w) => map.set(w.id, w));
    return map;
  }, [currentExercise]);

  const hintPolicy = currentExercise !== null ? getHintPolicy(currentExercise.level) : 'on-demand';

  
  useEffect(() => {
    if (lastResult !== null && hintPolicy === 'reveal-on-check') {
      setAutoHintVisible(true);
      const timeoutId = window.setTimeout(() => setAutoHintVisible(false), HINT_AUTO_HIDE_MS);
      return () => window.clearTimeout(timeoutId);
    }
    return undefined;
  }, [lastResult, hintPolicy]);

  const findContainer = useCallback(
    (id: string): 'bank' | 'line' => (line.includes(id) ? 'line' : 'bank'),
    [line],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
   document.body.classList.add('dnd-dragging-lock');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    document.body.classList.remove('dnd-dragging-lock');
    const { active, over } = event;
    if (over === null || lastResult !== null) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const sourceContainer = findContainer(activeIdStr);
    const targetContainer = overIdStr === 'bank' || overIdStr === 'line' ? overIdStr : findContainer(overIdStr);

    if (sourceContainer === targetContainer) {
      const list = sourceContainer === 'bank' ? bank : line;
      const setList = sourceContainer === 'bank' ? setBank : setLine;
      const oldIndex = list.indexOf(activeIdStr);
      const newIndex = overIdStr === sourceContainer ? list.length - 1 : list.indexOf(overIdStr);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const next = [...list];
      next.splice(oldIndex, 1);
      next.splice(newIndex, 0, activeIdStr);
      setList(next);
      return;
    }

    const sourceList = sourceContainer === 'bank' ? bank : line;
    const targetList = targetContainer === 'bank' ? bank : line;
    const setSource = sourceContainer === 'bank' ? setBank : setLine;
    const setTarget = targetContainer === 'bank' ? setBank : setLine;

    const insertIndex = overIdStr === targetContainer ? targetList.length : targetList.indexOf(overIdStr);
    setSource(sourceList.filter((id) => id !== activeIdStr));
    setTarget([
      ...targetList.slice(0, Math.max(0, insertIndex)),
      activeIdStr,
      ...targetList.slice(Math.max(0, insertIndex)),
    ]);
  };

  const toggleReveal = (id: string) => {
    if (hintPolicy !== 'always' || lastResult !== null) return;
    setUsedHint(true);
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleNext = () => dispatch(advanceQueue());

  const handleFinishSession = () => {
    dispatch(resetSession());
    navigate(SESSION_LIST_PATH, { replace: true });
  };

  
  if (currentItem === undefined && queue.length > 0) {
    return (
      <div className={styles['summaryPage']}>
        <Trophy size={48} className={styles['summaryIcon']} />
        <h1 className={styles['summaryTitle']}>{t('scramble.summary.title')}</h1>
        <div className={styles['summaryStats']}>
          <div className={styles['summaryStat']}>
            <span className={styles['summaryStatVal']} style={{ color: '#22c55e' }}>{completed.length}</span>
            <span>{t('scramble.summary.completed')}</span>
          </div>
          <div className={styles['summaryStat']}>
            <span className={styles['summaryStatVal']} style={{ color: '#ef4444' }}>{mistakes.length}</span>
            <span>{t('scramble.summary.mistakes')}</span>
          </div>
        </div>
        <button type="button" className={styles['primaryBtn']} onClick={handleFinishSession}>
          {t('scramble.summary.backToList')}
        </button>
      </div>
    );
  }

  if (exerciseLoading || currentExercise === null) {
    return <FullPageSpinner label={t('scramble.loadingExercise')} />;
  }

  const showRoleFor = (id: string): string | undefined => {
    if (hintPolicy === 'always' && lastResult === null) {
      return revealed.has(id) ? wordMap.get(id)?.role : undefined;
    }
    if (lastResult !== null) {
      const shouldShow = hintPolicy === 'on-demand' ? revealed.has(id) : autoHintVisible || revealed.has(id);
      if (!shouldShow) return undefined;
      return lastResult.wordsWithRoles.find((w) => w.id === id)?.role;
    }
    return undefined;
  };

  const correctnessFor = (id: string): 'correct' | 'incorrect' | undefined => {
    if (lastResult === null) return undefined;
    const isDistractorWord = wordMap.get(id)?.isDistractor === true;
    if (isDistractorWord) return 'incorrect';
    const idx = line.indexOf(id);
    return lastResult.correctOrder[idx] === id ? 'correct' : 'incorrect';
  };

  const activeWord = activeId !== null ? wordMap.get(activeId) : undefined;

  return (
    <div className={styles['page']}>
      <header className={styles['sessionHeader']}>
        <div className={styles['progressTrack']}>
          <div className={styles['progressFill']} style={{ width: `${(queueIndex / queue.length) * 100}%` }} />
        </div>
        <div className={styles['headerRow']}>
          <span className={styles['stepLabel']}>{queueIndex + 1} / {queue.length}</span>
          {timeLeft !== null && lastResult === null && (
            <span className={`${styles['timer']} ${timeLeft <= 10 ? styles['timerWarn'] : ''}`}>{timeLeft}s</span>
          )}
          <button type="button" className={styles['exitBtn']} onClick={handleFinishSession} aria-label="Exit">
            <X size={18} />
          </button>
        </div>
      </header>

      <p className={styles['topicTag']}>#{currentExercise.topic}</p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        
        modifiers={[restrictToWindowEdges]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={styles['boardSection']}>
          <span className={styles['zoneLabel']}>{t('scramble.yourSentence')}</span>
          <SortableContext items={line} strategy={rectSortingStrategy}>
            <DroppableZone id="line" isEmpty={line.length === 0} placeholder={t('scramble.dropHere')}>
              {line.map((id) => {
                const w = wordMap.get(id);
                if (w === undefined) return null;
                return (
                  <SortableWordChip
                    key={id}
                    id={id}
                    word={w.word}
                    isDistractor={w.isDistractor}
                    revealedRole={showRoleFor(id)}
                    isCorrectness={correctnessFor(id)}
                    onWordClick={() => toggleReveal(id)}
                  />
                );
              })}
            </DroppableZone>
          </SortableContext>
        </div>

        <div className={styles['boardSection']}>
          <span className={styles['zoneLabel']}>{t('scramble.wordBank')}</span>
          <SortableContext items={bank} strategy={rectSortingStrategy}>
            <DroppableZone id="bank" isEmpty={bank.length === 0} placeholder="">
              {bank.map((id) => {
                const w = wordMap.get(id);
                if (w === undefined) return null;
                return (
                  <SortableWordChip
                    key={id}
                    id={id}
                    word={w.word}
                    isDistractor={w.isDistractor}
                    revealedRole={showRoleFor(id)}
                    isCorrectness={undefined}
                    onWordClick={() => toggleReveal(id)}
                  />
                );
              })}
            </DroppableZone>
          </SortableContext>
        </div>

        <DragOverlay>
          {activeWord !== undefined && (
         <WordChipView
           word={activeWord.word}
           isDistractor={activeWord.isDistractor}
           revealedRole={undefined}
           isCorrectness={undefined}
        />
      )}
        </DragOverlay>
      </DndContext>

      {hintPolicy === 'always' && lastResult === null && (
        <p className={styles['hintNote']}>
          <Lightbulb size={13} /> {t('scramble.hintNoteAlways')}
        </p>
      )}

      {lastResult === null ? (
        <button
          type="button"
          className={styles['primaryBtn']}
          disabled={line.length === 0 || submitting}
          onClick={() => { void handleSubmit(); }}
        >
          {submitting ? t('scramble.checking') : t('scramble.checkAnswer')}
        </button>
      ) : (
        <div className={`${styles['resultBanner']} ${lastResult.isCorrect ? styles['resultOk'] : styles['resultErr']}`}>
          <div className={styles['resultHeader']}>
            {lastResult.isCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            <span>{lastResult.isCorrect ? t('scramble.correct') : t('scramble.incorrect')}</span>
            {lastResult.isCorrect && <span className={styles['xpBadge']}>+{lastResult.xpEarned} XP</span>}
          </div>
          {!lastResult.isCorrect && <p className={styles['correctSentence']}>{lastResult.correctSentence}</p>}
          {hintPolicy === 'on-demand' && (
            <button
              type="button"
              className={styles['ghostBtn']}
              onClick={() => setRevealed(new Set(lastResult.wordsWithRoles.map((w) => w.id)))}
            >
              <Lightbulb size={13} /> {t('scramble.showBreakdown')}
            </button>
          )}
          <button type="button" className={styles['primaryBtn']} onClick={handleNext}>
            {t('scramble.next')} <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}