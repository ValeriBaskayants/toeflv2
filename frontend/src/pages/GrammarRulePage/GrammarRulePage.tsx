import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, BookOpenCheck, GraduationCap, Sparkles, Scale,
  AlertTriangle, Tag, Link2, Library, Dumbbell,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  fetchGrammarRuleDetail,
  clearDetail,
  selectGrammarRuleDetail,
  selectGrammarRuleDetailIsLoading,
  selectGrammarRuleDetailError,
} from '@/store/Slices/GrammarRulesSlice';
import { BookmarkButton } from '@/components/layout/BookmarkButton/BookmarkButton';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { parseInlineMarkup } from '@/utils/parseInlineMarkup';
import type { GrammarExample, GrammarComparison } from '@/types/grammar/Grammar.types';
import styles from './GrammarRulePage.module.css';

const LEVEL_DISPLAY: Record<string, string> = {
  A1: 'A1', A1_PLUS: 'A1+', A2: 'A2', A2_PLUS: 'A2+',
  B1: 'B1', B1_PLUS: 'B1+', B2: 'B2', B2_PLUS: 'B2+', C1: 'C1', C2: 'C2',
};

function ExampleLine({ sentence, translation }: GrammarExample) {
  return (
    <div className={styles['example']}>
      <span className={styles['exampleBullet']}>○</span>
      <div>
        <p className={styles['exampleText']}>{parseInlineMarkup(sentence)}</p>
        {(translation?.length ?? 0) > 0 && (
          <p className={styles['exampleTranslation']}>{translation}</p>
        )}
      </div>
    </div>
  );
}

interface LetteredBlockProps {
  letter?: string | undefined;
  title: string;
  body: string;
  register?: string | undefined;
  examples: GrammarExample[];
}

function LetteredBlock({ letter, title, body, register, examples }: LetteredBlockProps) {
  return (
    <section id={letter !== undefined ? `point-${letter}` : undefined} className={styles['block']}>
      <div className={styles['blockHead']}>
        {letter !== undefined && <span className={styles['blockLetter']}>{letter}</span>}
        <h3 className={styles['blockTitle']}>{title}</h3>
        {register !== undefined && <span className={styles['registerBadge']}>{register}</span>}
      </div>
      <p className={styles['blockBody']}>{parseInlineMarkup(body)}</p>
      {(examples?.length ?? 0) > 0 && (
        <div className={styles['examplesList']}>
          {examples.map((ex, i) => <ExampleLine key={i} {...ex} />)}
        </div>
      )}
    </section>
  );
}

function CompareBlock({ letter, compareWith, explanation, examples }: GrammarComparison) {
  const { t } = useTranslation();
  return (
    <section id={letter !== undefined ? `point-${letter}` : undefined} className={styles['compareBlock']}>
      <div className={styles['compareLabel']}>
        <Scale size={14} />
        {t('grammar.reader.compareWith')}: <em>{compareWith}</em>
      </div>
      <p className={styles['blockBody']}>{parseInlineMarkup(explanation)}</p>
      {(examples?.length ?? 0) > 0 && (
        <div className={styles['examplesList']}>
          {examples.map((ex, i) => <ExampleLine key={i} {...ex} />)}
        </div>
      )}
    </section>
  );
}

export function GrammarRulePage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const detail = useAppSelector(selectGrammarRuleDetail);
  const isLoading = useAppSelector(selectGrammarRuleDetailIsLoading);
  const error = useAppSelector(selectGrammarRuleDetailError);

  useEffect(() => {
    if (slug !== undefined) {
      void dispatch(fetchGrammarRuleDetail(slug));
    }
    return () => {
      dispatch(clearDetail());
    };
  }, [slug, dispatch]);

  if (isLoading || detail === null) {
    if (error !== null) {
      return (
        <div className={styles['errorState']}>
          <AlertTriangle size={40} />
          <p>{error}</p>
          <button type="button" className={styles['backBtn']} onClick={() => navigate('/grammar')}>
            <ArrowLeft size={15} /> {t('grammar.reader.backToList')}
          </button>
        </div>
      );
    }
    return <FullPageSpinner label={t('grammar.loading')} />;
  }

  const isAdvanced = detail.tier === 'ADVANCED';

  return (
    <div className={styles['page']}>
      <div className={styles['topBar']}>
        <Link to="/grammar" className={styles['backLink']}>
          <ArrowLeft size={15} /> {t('grammar.reader.backToList')}
        </Link>
        <BookmarkButton targetId={detail.id} type="GRAMMAR_RULE" size="md" />
      </div>

      <article className={styles['reader']}>
        <header className={styles['readerHead']}>
          <div className={styles['badgeRow']}>
            <span className={styles['levelTag']}>{LEVEL_DISPLAY[detail.level] ?? detail.level}</span>
            <span className={`${styles['tierBadge']} ${isAdvanced ? styles['tierAdvanced'] : styles['tierFoundation']}`}>
              {isAdvanced ? <Sparkles size={13} /> : <GraduationCap size={13} />}
              {isAdvanced ? t('grammar.reader.tierAdvanced') : t('grammar.reader.tierFoundation')}
            </span>
          </div>

          <h1 className={styles['title']}>{detail.topic}</h1>

          {(detail.sourceAttribution?.length ?? 0) > 0 && (
            <p className={styles['attribution']}>
              <Library size={13} /> {t('grammar.reader.source')}: {detail.sourceAttribution}
            </p>
          )}

          {(detail.summary?.length ?? 0) > 0 && <p className={styles['lead']}>{parseInlineMarkup(detail.summary)}</p>}

          {((detail.coreConcept?.length ?? 0) > 0 || (detail.structure?.length ?? 0) > 0) && (
            <div className={styles['formulaBox']}>
              {(detail.coreConcept?.length ?? 0) > 0 && (
                <p className={styles['formulaLine']}>
                  <BookOpenCheck size={15} /> {parseInlineMarkup(detail.coreConcept)}
                </p>
              )}
              {(detail.structure?.length ?? 0) > 0 && (
                <p className={styles['formulaStructure']}>{detail.structure}</p>
              )}
            </div>
          )}
        </header>

        {(detail.usages?.length ?? 0) > 0 && (
          <div className={styles['blockGroup']}>
            {detail.usages.map((u, i) => (
              <LetteredBlock key={i} letter={u.letter} title={u.title} body={u.explanation} register={u.register} examples={u.examples} />
            ))}
          </div>
        )}

        {(detail.sections?.length ?? 0) > 0 && (
          <div className={styles['blockGroup']}>
            {detail.sections.map((s, i) => (
              <LetteredBlock key={i} letter={s.letter} title={s.title} body={s.content} register={s.register} examples={s.examples} />
            ))}
          </div>
        )}

        {(detail.comparisons?.length ?? 0) > 0 && (
          <div className={styles['blockGroup']}>
            {detail.comparisons.map((c, i) => <CompareBlock key={i} {...c} />)}
          </div>
        )}

        {(detail.commonMistakes?.length ?? 0) > 0 && (
          <div className={styles['mistakesBox']}>
            <AlertTriangle size={18} className={styles['mistakesIcon']} />
            <div>
              <p className={styles['mistakesTitle']}>{t('grammar.reader.commonMistakes')}</p>
              <ul className={styles['mistakesList']}>
                {detail.commonMistakes.map((m, i) => <li key={i}>{parseInlineMarkup(m)}</li>)}
              </ul>
            </div>
          </div>
        )}

        {(detail.signalWords?.length ?? 0) > 0 && (
          <div className={styles['tagSection']}>
            <span className={styles['tagSectionLabel']}><Tag size={13} /> {t('grammar.reader.signalWords')}</span>
            <div className={styles['tagRow']}>
              {detail.signalWords.map((w) => <span key={w} className={styles['wordTag']}>{w}</span>)}
            </div>
          </div>
        )}

        {(detail.crossReferences?.length ?? 0) > 0 && (
          <div className={styles['tagSection']}>
            <span className={styles['tagSectionLabel']}><Link2 size={13} /> {t('grammar.reader.seeAlso')}</span>
            <div className={styles['crossRefRow']}>
              {detail.crossReferences.map((ref, i) => (
                <a
                  key={i}
                  href={ref.targetSlug !== undefined ? `/grammar/${ref.targetSlug}` : `#point-${ref.targetAnchor ?? ''}`}
                  className={styles['crossRefChip']}
                >
                  {ref.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {(detail.relatedTopics?.length ?? 0) > 0 && (
          <div className={styles['tagSection']}>
            <span className={styles['tagSectionLabel']}>{t('grammar.reader.relatedTopics')}</span>
            <div className={styles['crossRefRow']}>
              {detail.relatedTopics.map((topicSlug) => (
                <Link key={topicSlug} to={`/grammar/${topicSlug}`} className={styles['crossRefChip']}>
                  {topicSlug.replace(/-/g, ' ')}
                </Link>
              ))}
            </div>
          </div>
        )}

        {(detail.relatedExercises?.length ?? 0) > 0 && (
          <div className={styles['exerciseSection']}>
            <span className={styles['tagSectionLabel']}><Dumbbell size={13} /> {t('grammar.reader.relatedExercises')}</span>
            <div className={styles['exerciseList']}>
              {detail.relatedExercises.map((ex) => (
                <Link key={ex.id} to={`/exercises/${ex.topic}`} className={styles['exerciseItem']}>
                  <span className={styles['exerciseSentence']}>{ex.sentence}</span>
                  <span className={styles['exerciseDifficulty']}>{ex.difficulty.toLowerCase()}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}