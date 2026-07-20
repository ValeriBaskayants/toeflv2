import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2 } from 'lucide-react';
import type { MCQCard as MCQCardType } from '@/types/vocabulary/Vocabulary';
import { LevelBadge, PosBadge } from '../../shared/Badges';
import styles from './McqCard.module.css';

interface Props {
    card: MCQCardType;
    disabled: boolean;
    feedback: 'idle' | 'correct' | 'wrong';
    selectedId: string | null;
    onSelect: (optionId: string) => void;
}

const HOTKEYS = ['1', '2', '3', '4'];

export function McqCard({ card, disabled, feedback, selectedId, onSelect }: Props) {
    const { t } = useTranslation('vocabulary');
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    useEffect(() => {
        setHoveredId(null);
    }, [card.cardId]);

    const handleSelect = useCallback(
        (optionId: string) => {
            if (disabled) return;
            onSelect(optionId);
        },
        [disabled, onSelect],
    );

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (disabled) return;
            const idx = HOTKEYS.indexOf(e.key);
            if (idx === -1) return;
            const opt = card.options[idx];
            if (opt !== undefined) handleSelect(opt.id);
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [card, disabled, handleSelect]);

    return (
        <div className={styles['card']}>
            <div className={styles['head']}>
                <LevelBadge level={card.level} />
                <PosBadge type={card.partOfSpeech} />
            </div>

            <div className={styles['wordBlock']}>
                <h2 className={styles['word']}>{card.word}</h2>
                {card.pronunciation.length > 0 && (
                    <span className={styles['pron']}>
                        <Volume2 size={13} />/{card.pronunciation}/
                    </span>
                )}
            </div>

            <p className={styles['prompt']}>{t('flashcard.selectDefinition')}</p>

            <div className={styles['options']} role="listbox" aria-label={t('flashcard.selectDefinition')}>
                {card.options.map((opt, i) => {
                    const isSelected = selectedId === opt.id;
                    const isCorrectOpt = feedback !== 'idle' && opt.id === card.cardId;
                    const isWrongPick = feedback === 'wrong' && isSelected;

                    return (
                        <button
                            key={opt.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            disabled={disabled}
                            className={[
                                styles['option'],
                                hoveredId === opt.id && !disabled ? styles['optionFocused'] : '',
                                isCorrectOpt ? styles['optionCorrect'] : '',
                                isWrongPick ? styles['optionWrong'] : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            onMouseEnter={() => setHoveredId(opt.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            onClick={() => handleSelect(opt.id)}
                        >
                            <span className={styles['optionKey']}>{HOTKEYS[i]}</span>
                            <span className={styles['optionText']}>{opt.text}</span>
                        </button>
                    );
                })}
            </div>

            <p className={styles['hint']}>{t('flashcard.mcqHotkeyHint')}</p>
        </div>
    );
}