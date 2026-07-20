import { useState, useCallback, type CSSProperties, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { BookmarkButton } from '@/components/layout/BookmarkButton/BookmarkButton';
import type { VocabularyWord } from '@/types/vocabulary/Vocabulary';
import { PartOfSpeech } from '@/types/globalTypes';
import { LevelBadge, PosBadge, LEVEL_COLOR } from '../shared/Badges';
import styles from './BrowseMode.module.css';

export function WordCard({ word }: { word: VocabularyWord }) {
    const { t } = useTranslation('vocabulary');
    const [expanded, setExpanded] = useState(false);
    const color = LEVEL_COLOR[word.level] ?? '#6366f1';

    const toggle = useCallback(() => setExpanded((p) => !p), []);
    const handleKey = useCallback(
        (e: KeyboardEvent<HTMLElement>) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
            }
        },
        [toggle],
    );

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
                    {word.isIrregularVerb && <span className={styles['wordCardIrreg']}>{t('badge.irregular')}</span>}
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
                    {word.definitionRu.length > 0 && <p className={styles['wordCardDefRu']}>{word.definitionRu}</p>}
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