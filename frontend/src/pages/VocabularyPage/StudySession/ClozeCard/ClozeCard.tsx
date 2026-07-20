import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ClozeCard as ClozeCardType } from '@/types/vocabulary/Vocabulary';
import { levenshteinDistance } from '@/utils/levenshtein';
import { normalizeWord } from '@/utils/vocabText';
import { LevelBadge, PosBadge } from '../../shared/Badges';
import styles from './ClozeCard.module.css';

interface Props {
  card: ClozeCardType;
  disabled: boolean;
  feedback: 'idle' | 'correct' | 'wrong';
  onSubmit: (answerText: string) => void;
}

const TYPO_ANIM_MS = 900;

export function ClozeCard({ card, disabled, feedback, onSubmit }: Props) {
  const { t } = useTranslation('vocabulary');
  const [value, setValue] = useState('');
  const [typo, setTypo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue('');
    setTypo(false);
    inputRef.current?.focus();
  }, [card.cardId]);

  const handleSubmit = useCallback(() => {
    if (disabled || value.trim().length === 0) return;

    const userNorm = normalizeWord(value);
    const correctNorm = normalizeWord(card.answer);

    // Fuzzy typo guard: 1-letter slip on a word longer than 4 chars doesn't burn the attempt.
    if (userNorm !== correctNorm && card.answer.length > 4) {
      const dist = levenshteinDistance(userNorm, correctNorm);
      if (dist === 1) {
        setTypo(true);
        window.setTimeout(() => setTypo(false), TYPO_ANIM_MS);
        return;
      }
    }

    onSubmit(value);
  }, [disabled, value, card.answer, onSubmit]);

  const displayValue = feedback === 'wrong' ? card.answer : value;

  return (
    <div className={styles['card']}>
      <div className={styles['head']}>
        <LevelBadge level={card.level} />
        <PosBadge type={card.partOfSpeech} />
      </div>

      <p className={styles['sentence']}>
        {card.before}
        <span className={styles['blankWrap']}>
          <input
            ref={inputRef}
            type="text"
            className={[
              styles['blankInput'],
              typo ? styles['blankInputTypo'] : '',
              feedback === 'correct' ? styles['blankInputCorrect'] : '',
              feedback === 'wrong' ? styles['blankInputWrong'] : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ width: `${Math.max(card.wordLength, 4) + 2}ch` }}
            value={displayValue}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            disabled={disabled}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label={t('flashcard.clozeInputLabel')}
          />
        </span>
        {card.after}
      </p>

      {typo && <p className={styles['typoHint']}>{t('flashcard.typoHint')}</p>}

      {card.synonyms.length > 0 && (
        <p className={styles['synonymsHint']}>
          {t('flashcard.synonymsHint')}: {card.synonyms.join(', ')}
        </p>
      )}

      <button
        type="button"
        className={styles['submitBtn']}
        onClick={handleSubmit}
        disabled={disabled || value.trim().length === 0}
      >
        {t('flashcard.checkAnswer')} <kbd className={styles['kbd']}>Enter</kbd>
      </button>
    </div>
  );
}