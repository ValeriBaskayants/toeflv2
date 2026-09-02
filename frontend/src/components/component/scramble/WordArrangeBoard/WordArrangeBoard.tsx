import { useCallback, useState } from 'react';
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, useDroppable, closestCenter,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { SortableContext, useSortable, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './WordArrangeBoard.module.css';

export interface WordArrangeItem {
  id: string;
  word: string;
}

interface SortableChipProps {
  id: string;
  word: string;
  locked: boolean;
  extra?: React.ReactNode;
  extraClassName?: string | undefined;   
  onWordClick?: ((id: string) => void) | undefined;
}

function SortableChip({ id, word, locked, extra, extraClassName, onWordClick }: SortableChipProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id, disabled: locked });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition: transition ?? undefined, opacity: isDragging ? 0.35 : 1 }}
      {...attributes}
      {...listeners}
      className={[styles['chip'], extraClassName ?? '', isDragging ? styles['chipDragging'] : ''].join(' ')}
      onClick={(e) => {
        e.stopPropagation();
        onWordClick?.(id);
      }}
    >
      <span>{word}</span>
      {extra}
    </div>
  );
}

interface DropZoneProps {
  id: 'bank' | 'line';
  children: React.ReactNode;
  isEmpty: boolean;
  placeholder: string;
}

function DropZone({ id, children, isEmpty, placeholder }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${styles['dropZone']} ${isOver ? styles['dropZoneOver'] : ''}`}>
      {isEmpty && <span className={styles['placeholder']}>{placeholder}</span>}
      {children}
    </div>
  );
}

export interface WordArrangeBoardProps {
  words: WordArrangeItem[];
  bank: string[];
  line: string[];
  onBankChange: (ids: string[]) => void;
  onLineChange: (ids: string[]) => void;
  locked?: boolean;
  getChipExtra?: (id: string) => React.ReactNode;
  getChipClassName?: (id: string) => string | undefined;
  onChipClick?: (id: string) => void;
  labels: { yourSentence: string; wordBank: string; dropHere: string };
}

export function WordArrangeBoard({
  words, bank, line, onBankChange, onLineChange, locked = false,
  getChipExtra, getChipClassName, onChipClick, labels,
}: WordArrangeBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const wordMap = new Map(words.map((w) => [w.id, w]));

  const findContainer = useCallback(
    (id: string): 'bank' | 'line' => (line.includes(id) ? 'line' : 'bank'),
    [line],
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (locked) return;
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    if (locked) return;

    const { active, over } = event;
    if (over === null) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const sourceContainer = findContainer(activeIdStr);
    const targetContainer = overIdStr === 'bank' || overIdStr === 'line' ? overIdStr : findContainer(overIdStr);

    if (sourceContainer === targetContainer) {
      const list = sourceContainer === 'bank' ? bank : line;
      const setList = sourceContainer === 'bank' ? onBankChange : onLineChange;
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
    const setSource = sourceContainer === 'bank' ? onBankChange : onLineChange;
    const setTarget = targetContainer === 'bank' ? onBankChange : onLineChange;
    const insertIndex = overIdStr === targetContainer ? targetList.length : targetList.indexOf(overIdStr);

    setSource(sourceList.filter((id) => id !== activeIdStr));
    setTarget([
      ...targetList.slice(0, Math.max(0, insertIndex)),
      activeIdStr,
      ...targetList.slice(Math.max(0, insertIndex)),
    ]);
  };

  const activeWord = activeId !== null ? wordMap.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={styles['boardSection']}>
        <span className={styles['zoneLabel']}>{labels.yourSentence}</span>
        <SortableContext items={line} strategy={rectSortingStrategy}>
          <DropZone id="line" isEmpty={line.length === 0} placeholder={labels.dropHere}>
            {line.map((id) => {
              const w = wordMap.get(id);
              if (w === undefined) return null;
              return (
                <SortableChip
                  key={id}
                  id={id}
                  word={w.word}
                  locked={locked}
                  extra={getChipExtra?.(id)}
                  extraClassName={getChipClassName?.(id)}
                  onWordClick={onChipClick}
                />
              );
            })}
          </DropZone>
        </SortableContext>
      </div>

      <div className={styles['boardSection']}>
        <span className={styles['zoneLabel']}>{labels.wordBank}</span>
        <SortableContext items={bank} strategy={rectSortingStrategy}>
          <DropZone id="bank" isEmpty={bank.length === 0} placeholder="">
            {bank.map((id) => {
              const w = wordMap.get(id);
              if (w === undefined) return null;
              return (
                <SortableChip
                  key={id}
                  id={id}
                  word={w.word}
                  locked={locked}
                  extra={getChipExtra?.(id)}
                  extraClassName={getChipClassName?.(id)}
                  onWordClick={onChipClick}
                />
              );
            })}
          </DropZone>
        </SortableContext>
      </div>

      <DragOverlay>
        {activeWord !== undefined && <div className={styles['chip']}>{activeWord.word}</div>}
      </DragOverlay>
    </DndContext>
  );
}