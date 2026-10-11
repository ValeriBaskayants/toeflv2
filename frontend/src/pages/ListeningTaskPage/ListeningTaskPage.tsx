import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronRight, Clock, Play, RefreshCw, Zap, BookOpen, Headphones } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { clearStartError, fetchTypeList, startListeningSession, startToeflListening } from '@/store/Slices/ListeningSlice';
import { getTaskBySlug, type ListeningTaskMeta } from '@/constants/listening';
import { LEVEL_DISPLAY, getLevelColor } from '@/constants/level';
import { ListeningMode } from '@/types/globalTypes';
import { cx } from '@/utils/cx';
import styles from './ListeningTaskPage.module.css';

const LEVEL_KEYS = Object.keys(LEVEL_DISPLAY);
const SKELETON_COUNT = 6;

export default function ListeningTaskPage() {
  const { taskSlug } = useParams<{ taskSlug: string }>();
  const task = getTaskBySlug(taskSlug);
  if (task === undefined) return <Navigate to="/listening" replace />;
  return <TaskContent key={task.type} task={task} />;
}

function TaskContent({ task }: { task: ListeningTaskMeta }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const list = useAppSelector((s) => s.listening.lists[task.type]);
  const loading = useAppSelector((s) => s.listening.listLoading[task.type] === true);
  const error = useAppSelector((s) => s.listening.listError[task.type] ?? null);
  const starting = useAppSelector((s) => s.listening.starting);
  const startError = useAppSelector((s) => s.listening.startError);

  const [level, setLevel] = useState<string | null>(null);
  const Icon = task.icon;

  useEffect(() => {
    void dispatch(fetchTypeList({ type: task.type }));
  }, [dispatch, task.type]);

  // Ошибка старта показывается на этой странице и очищается при уходе — чтобы не «протекать» на другие страницы.
  useEffect(() => () => { dispatch(clearStartError()); }, [dispatch]);

  const items = useMemo(() => list?.items ?? [], [list]);
  const presentLevels = useMemo(() => LEVEL_KEYS.filter((lv) => items.some((m) => m.level === lv)), [items]);
  const activeLevel = level !== null && presentLevels.includes(level) ? level : null;
  const visible = activeLevel === null ? items : items.filter((m) => m.level === activeLevel);

  const handleToefl = useCallback(async () => {
    const result = await dispatch(startToeflListening(task.type));
    if (startToeflListening.fulfilled.match(result)) navigate(`/listening/session/${result.payload.id}`);
  }, [dispatch, navigate, task.type]);

  const handleStart = useCallback(
    async (materialId: string, mode: ListeningMode) => {
      const result = await dispatch(startListeningSession({ materialId, mode }));
      if (startListeningSession.fulfilled.match(result)) navigate(`/listening/session/${result.payload.id}`);
    },
    [dispatch, navigate],
  );

  return (
    <div className={styles['page']} style={{ '--task-color': task.color } as React.CSSProperties}>
      <button type="button" className={styles['backLink']} onClick={() => navigate('/listening')}>
        <ArrowLeft size={15} /> {t('listening.task.back')}
      </button>

      <header className={styles['header']}>
        <div className={styles['headerIcon']}><Icon size={26} /></div>
        <div>
          <h1 className={styles['pageTitle']}>{t(`listening.tasks.${task.key}.name`)}</h1>
          <p className={styles['pageSubtitle']}>{t(`listening.tasks.${task.key}.format`)}</p>
        </div>
      </header>

      <div className={styles['startRow']}>
        <button type="button" className={styles['toeflCard']} onClick={() => { void handleToefl(); }} disabled={starting}>
          <div className={styles['toeflIco']}><Zap size={22} /></div>
          <div className={styles['toeflBody']}>
            <span className={styles['toeflTitle']}>{t('listening.task.toeflTitle')}</span>
            <span className={styles['toeflDesc']}>{t('listening.task.toeflDesc')}</span>
          </div>
          <ChevronRight size={18} className={styles['toeflArrow']} />
        </button>

        <section className={styles['rules']} aria-label={t('listening.task.rulesTitle')}>
          <h2 className={styles['rulesTitle']}>{t('listening.task.rulesTitle')}</h2>
          <ul className={styles['rulesList']}>
            <li>{t('listening.task.rules.once')}</li>
            <li>{t('listening.task.rules.noBack')}</li>
            <li>{t('listening.task.rules.oneTimer')}</li>
            <li>{t('listening.task.rules.notes')}</li>
          </ul>
          <p className={styles['guidedNote']}>{t('listening.task.guidedNote')}</p>
        </section>
      </div>

      {startError !== null && (
        <p className={styles['errorText']} role="alert"><AlertCircle size={14} /> {startError}</p>
      )}

      <div className={styles['filterBar']}>
        <span className={styles['filterLabel']}>{t('listening.task.filtersLevel')}</span>
        <div className={styles['chips']}>
          <button type="button" className={cx(styles['chip'], activeLevel === null && styles['chipActive'])} onClick={() => setLevel(null)}>
            {t('listening.task.allLevels')}
          </button>
          {presentLevels.map((lv) => (
            <button key={lv} type="button" className={cx(styles['chip'], activeLevel === lv && styles['chipActive'])} onClick={() => setLevel(activeLevel === lv ? null : lv)}>
              {LEVEL_DISPLAY[lv] ?? lv}
            </button>
          ))}
        </div>
      </div>

      {error !== null && list === undefined && (
        <div className={styles['errorBanner']} role="alert">
          <AlertCircle size={15} />
          <span>{t('listening.task.loadError')}</span>
          <button type="button" className={styles['retryBtn']} onClick={() => void dispatch(fetchTypeList({ type: task.type, force: true }))}>
            <RefreshCw size={13} /> {t('listening.task.retry')}
          </button>
        </div>
      )}

      {loading && list === undefined && (
        <div className={styles['grid']} aria-busy="true">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => <div key={i} className={styles['skeleton']} />)}
        </div>
      )}

      {list !== undefined && visible.length === 0 && (
        <div className={styles['emptyState']}>
          <Headphones size={46} className={styles['emptyIcon']} />
          <p className={styles['emptyTitle']}>{t('listening.task.emptyTitle')}</p>
          <p className={styles['emptyHint']}>{t('listening.task.emptyHint')}</p>
        </div>
      )}

      {visible.length > 0 && (
        <div className={styles['grid']}>
          {visible.map((m) => {
            const color = getLevelColor(m.level);
            const canExam = m.allowedModes.includes(ListeningMode.PRACTICE);
            const canStudy = m.allowedModes.includes(ListeningMode.STUDY);
            return (
              <article key={m.id} className={styles['card']}>
                <div className={styles['cardTop']}>
                  <span className={styles['levelBadge']} style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
                    {LEVEL_DISPLAY[m.level] ?? m.level}
                  </span>
                  {m.userStatus === 'completed' && (
                    <span className={styles['statusDone']}>
                      <CheckCircle2 size={12} />
                      {m.bestScore !== null ? t('listening.task.best', { score: m.bestScore }) : t('listening.task.completed')}
                    </span>
                  )}
                  {m.userStatus === 'in_progress' && (
                    <span className={styles['statusProgress']}><Clock size={12} /> {t('listening.task.inProgress')}</span>
                  )}
                </div>
                <h3 className={styles['cardTitle']}>{m.title}</h3>
                <p className={styles['cardMeta']}>
                  <span className={styles['topic']}>#{m.topic}</span>
                  <span>{t('listening.questionsCount', { count: m._count.questions })}</span>
                </p>
                <div className={styles['cardActions']}>
                  {canExam && (
                    <button type="button" className={styles['examBtn']} disabled={starting} onClick={() => { void handleStart(m.id, ListeningMode.PRACTICE); }}>
                      <Play size={13} /> {t('listening.task.examMode')}
                    </button>
                  )}
                  {canStudy && (
                    <button type="button" className={styles['studyBtn']} disabled={starting} title={t('listening.task.studyHint')} onClick={() => { void handleStart(m.id, ListeningMode.STUDY); }}>
                      <BookOpen size={13} /> {t('listening.task.studyMode')}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}