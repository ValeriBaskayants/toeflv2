import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, MessageSquare, ChevronRight, AlertCircle, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { fetchPrompts, startSession, startToeflSession, setLevelFilter, resetSession } from '@/store/Slices/WritingSlice';
import { WritingType } from '@/types/globalTypes';
import { LEVEL_DISPLAY, getLevelColor } from '@/constants/level';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './WritingTypeHubPage.module.css';

const LEVELS = ['A1', 'A1_PLUS', 'A2', 'A2_PLUS', 'B1', 'B1_PLUS', 'B2', 'B2_PLUS', 'C1', 'C2'];

interface WritingTypeHubPageProps {
  type: typeof WritingType.EMAIL | typeof WritingType.ACADEMIC_DISCUSSION;
}

const ICON = { [WritingType.EMAIL]: Mail, [WritingType.ACADEMIC_DISCUSSION]: MessageSquare } as const;
const ACCENT = { [WritingType.EMAIL]: '#0ea5e9', [WritingType.ACADEMIC_DISCUSSION]: '#8b5cf6' } as const;

export default function WritingTypeHubPage({ type }: WritingTypeHubPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { prompts, promptsLoading, promptsError, levelFilter, sessionStarting, sessionError } = useAppSelector((s) => s.writing);

  const Icon = ICON[type];
  const accent = ACCENT[type];
  const i18nKey = type === WritingType.EMAIL ? 'email' : 'discussion';

  useEffect(() => {
    dispatch(resetSession());
    const params = levelFilter !== null ? { level: levelFilter } : undefined;
    void dispatch(fetchPrompts(params));
  }, [dispatch, levelFilter]);

  const typedPrompts = prompts.filter((p) => p.type === type);

  const handleRetry = useCallback(() => {
    void dispatch(fetchPrompts(levelFilter !== null ? { level: levelFilter } : undefined));
  }, [dispatch, levelFilter]);

  const handleStartToefl = useCallback(async () => {
    try {
      const data = await dispatch(startToeflSession(type)).unwrap();
      navigate(`/writing/session/${data.sessionId}`);
    } catch {
      // ошибка уже в state.writing.sessionError
    }
  }, [dispatch, navigate, type]);

  const handleStartPrompt = useCallback(async (promptId: string) => {
    try {
      const data = await dispatch(startSession(promptId)).unwrap();
      navigate(`/writing/session/${data.sessionId}`);
    } catch {
      // ошибка уже в state.writing.sessionError
    }
  }, [dispatch, navigate]);

  if (promptsLoading && prompts.length === 0) {
    return <FullPageSpinner label={t('writing.loading')} />;
  }

  return (
    <div className={styles['page']} style={{ '--accent-color': accent } as React.CSSProperties}>
      <header className={styles['header']}>
        <h1 className={styles['pageTitle']}>
          <Icon size={22} className={styles['pageTitleIcon']} />
          {t(`writing.${i18nKey}.title`)}
        </h1>
        <p className={styles['pageSubtitle']}>{t(`writing.${i18nKey}.subtitle`)}</p>
      </header>

      <button type="button" className={styles['toeflCard']} onClick={() => { void handleStartToefl(); }} disabled={sessionStarting}>
        <div className={styles['toeflCardIco']}><Icon size={22} /></div>
        <div className={styles['toeflCardBody']}>
          <span className={styles['toeflCardTitle']}>{t(`writing.${i18nKey}.toeflCardTitle`)}</span>
          <span className={styles['toeflCardDesc']}>{t(`writing.${i18nKey}.toeflCardDesc`)}</span>
        </div>
        <ChevronRight size={18} className={styles['toeflCardArrow']} />
      </button>

      {sessionError !== null && (
        <p className={styles['errorText']}><AlertCircle size={13} /> {sessionError}</p>
      )}

      <div className={styles['filterBar']}>
        <span className={styles['filterLabel']}>{t('scramble.filters.level')}</span>
        <div className={styles['chips']}>
          <button
            type="button"
            className={`${styles['chip']} ${levelFilter === null ? styles['chipActive'] : ''}`}
            onClick={() => dispatch(setLevelFilter(null))}
          >
            {t('scramble.filters.allLevels')}
          </button>
          {LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              className={`${styles['chip']} ${levelFilter === lv ? styles['chipActive'] : ''}`}
              onClick={() => dispatch(setLevelFilter(levelFilter === lv ? null : lv))}
            >
              {LEVEL_DISPLAY[lv]}
            </button>
          ))}
        </div>
      </div>

      {promptsError !== null && (
        <div className={styles['errorBanner']}>
          <AlertCircle size={15} />
          <span>{t('writing.error')}</span>
          <button type="button" className={styles['retryBtn']} onClick={handleRetry}>
            <RefreshCw size={13} /> {t('writing.retry')}
          </button>
        </div>
      )}

      {!promptsLoading && promptsError === null && typedPrompts.length === 0 && (
        <div className={styles['emptyState']}>
          <Icon size={48} className={styles['emptyIcon']} />
          <p className={styles['emptyTitle']}>{t('writing.empty.title')}</p>
          <p className={styles['emptyHint']}>{t('writing.empty.hint')}</p>
        </div>
      )}

      <div className={styles['grid']}>
        {typedPrompts.map((p) => (
          <article key={p.id} className={styles['promptCard']} onClick={() => { void handleStartPrompt(p.id); }} role="button" tabIndex={0}>
            <div className={styles['promptCardTop']}>
              <span className={styles['levelBadge']} style={{ color: getLevelColor(p.level), background: `color-mix(in srgb, ${getLevelColor(p.level)} 12%, transparent)` }}>
                {LEVEL_DISPLAY[p.level] ?? p.level}
              </span>
              {p.userStatus === 'completed' && (
                <span className={styles['statusDone']}>
                  <CheckCircle2 size={12} />
                  {p.userBestScore !== null ? `${Math.round(p.userBestScore)}%` : t('writing.status.completed')}
                </span>
              )}
              {p.userStatus === 'in_progress' && (
                <span className={styles['statusProgress']}><Clock size={12} />{t('writing.status.inProgress')}</span>
              )}
            </div>
            {p.topic !== '' && <p className={styles['promptTopic']}>#{p.topic}</p>}
            <p className={styles['promptText']}>{p.prompt.split('\n')[0]}</p>
          </article>
        ))}
      </div>
    </div>
  );
}