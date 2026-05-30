import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Headphones,
  Search,
  BookOpen,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  MessageSquare,
  Zap,
  BarChart2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { fetchMaterials, setFilter, clearPlayerState } from '@/store/Slices/ListeningSlice';

import { fetchBookmarks } from '@/store/Slices/BookMarksSlice';
import { BookmarkButton } from '@/components/layout/BookmarkButton/BookmarkButton';

import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './ListeningPage.module.css';
import type { ListeningMaterialListItem } from '@/types/listening/Listening.types';

const LEVELS = ['A1', 'A1_PLUS', 'A2', 'A2_PLUS', 'B1', 'B1_PLUS', 'B2', 'B2_PLUS', 'C1', 'C2'];
const LEVEL_DISPLAY: Record<string, string> = {
  A1: 'A1',
  A1_PLUS: 'A1+',
  A2: 'A2',
  A2_PLUS: 'A2+',
  B1: 'B1',
  B1_PLUS: 'B1+',
  B2: 'B2',
  B2_PLUS: 'B2+',
  C1: 'C1',
  C2: 'C2',
};

const MODE_INFO = {
  EASY: { color: '#22c55e', label: '∞', xp: '×0.7' },
  MEDIUM: { color: '#f59e0b', label: '×3', xp: '×1.0' },
  HARD: { color: '#ef4444', label: '×1', xp: '×1.3' },
};

function MaterialCard({ material }: { material: ListeningMaterialListItem }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const handleClick = () => {
    dispatch(clearPlayerState());
    navigate(`/listening/${material.id}`);
  };

  const isLecture = material.type === 'LECTURE';

  return (
    <article
      className={styles['card']}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleClick();
      }}
    >
      <div
        className={`${styles['typeIcon']} ${isLecture ? styles['typeIconLecture'] : styles['typeIconConv']}`}
      >
        {isLecture ? <BookOpen size={20} /> : <MessageSquare size={20} />}
      </div>

      <div className={styles['cardBody']}>
        <div
          className={styles['cardMeta']}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
        >
          <span className={styles['levelBadge']}>
            {LEVEL_DISPLAY[material.level] ?? material.level}
          </span>
          <span className={styles['typeBadge']}>
            {isLecture ? t('listening.type.lecture') : t('listening.type.conversation')}
          </span>
          <span className={styles['topicTag']}>#{material.topic}</span>

          {/* ОБЕРТКА ДЛЯ КНОПКИ ЗАКЛАДКИ */}
          {/* marginLeft: 'auto' прижмет её к правому краю, если cardMeta это flex-контейнер */}
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            style={{ marginLeft: 'auto', zIndex: 2, position: 'relative' }}
          >
            <BookmarkButton targetId={material.id} type={'LISTENING' as any} size="sm" />
          </div>
        </div>

        <h3 className={styles['cardTitle']}>{material.title}</h3>

        <div className={styles['cardStats']}>
          <span className={styles['cardStat']}>
            <BarChart2 size={12} />
            {material._count.questions} {t('listening.questions')}
          </span>
          <span className={styles['cardStat']}>
            <Zap size={12} />
            {material.allowedModes.length} {t('listening.modes')}
          </span>
        </div>

        <div className={styles['modePills']}>
          {material.allowedModes.map((mode) => {
            const info = MODE_INFO[mode as keyof typeof MODE_INFO];
            if (!info) return null;
            return (
              <span
                key={mode}
                className={styles['modePill']}
                style={{ '--mode-color': info.color } as React.CSSProperties}
              >
                {mode.charAt(0) + mode.slice(1).toLowerCase()} {info.label}
                <span className={styles['modePillXp']}>{info.xp}</span>
              </span>
            );
          })}
        </div>
      </div>

      <ChevronRight size={16} className={styles['cardArrow']} />
    </article>
  );
}

function FilterBar() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { filters } = useAppSelector((state) => state.listening);
  const [searchDraft, setSearchDraft] = useState(filters.search);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(setFilter({ key: 'search', value: searchDraft }));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchDraft, dispatch]);

  return (
    <div className={styles['filterBar']}>
      <div className={styles['searchWrap']}>
        <Search size={15} className={styles['searchIcon']} />
        <input
          type="text"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder={t('listening.filters.searchPlaceholder')}
          className={styles['searchInput']}
        />
        {searchDraft.length > 0 && (
          <button
            type="button"
            className={styles['searchClear']}
            onClick={() => {
              setSearchDraft('');
              dispatch(setFilter({ key: 'search', value: '' }));
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Type toggle */}
      <div className={styles['typeToggle']}>
        {[null, 'LECTURE', 'CONVERSATION'].map((type) => (
          <button
            key={String(type)}
            type="button"
            className={`${styles['typeBtn']} ${filters.type === type ? styles['typeBtnActive'] : ''}`}
            onClick={() => dispatch(setFilter({ key: 'type', value: type }))}
          >
            {type === null
              ? t('listening.filters.allTypes')
              : type === 'LECTURE'
                ? t('listening.type.lecture')
                : t('listening.type.conversation')}
          </button>
        ))}
      </div>

      <div className={styles['levelChips']}>
        <button
          type="button"
          className={`${styles['levelChip']} ${filters.level === null ? styles['levelChipActive'] : ''}`}
          onClick={() => dispatch(setFilter({ key: 'level', value: null }))}
        >
          {t('listening.filters.allLevels')}
        </button>
        {LEVELS.map((lv) => (
          <button
            key={lv}
            type="button"
            className={`${styles['levelChip']} ${filters.level === lv ? styles['levelChipActive'] : ''}`}
            onClick={() =>
              dispatch(setFilter({ key: 'level', value: filters.level === lv ? null : lv }))
            }
          >
            {LEVEL_DISPLAY[lv]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ListeningPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { materials, materialsLoading, materialsError, filters } = useAppSelector(
    (state) => state.listening,
  );

  useEffect(() => {
    void dispatch(fetchBookmarks());
  }, [dispatch]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters.level) params['level'] = filters.level;
    if (filters.type) params['type'] = filters.type;
    if (filters.search.trim()) params['search'] = filters.search.trim();
    void dispatch(fetchMaterials(Object.keys(params).length > 0 ? params : undefined));
  }, [dispatch, filters.level, filters.type, filters.search]);

  const handleRetry = useCallback(() => {
    void dispatch(fetchMaterials());
  }, [dispatch]);

  if (materialsLoading && materials.length === 0) {
    return <FullPageSpinner label={t('listening.loading')} />;
  }

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <div>
          <h1 className={styles['pageTitle']}>
            <Headphones size={22} className={styles['pageTitleIcon']} />
            {t('listening.title')}
          </h1>
          <p className={styles['pageSubtitle']}>{t('listening.subtitle')}</p>
        </div>
        {materials.length > 0 && (
          <span className={styles['countBadge']}>
            {materials.length} {t('listening.materialsCount')}
          </span>
        )}
      </header>

      <FilterBar />

      {materialsError !== null && (
        <div className={styles['errorBanner']}>
          <AlertCircle size={15} />
          <span>{t('listening.error')}</span>
          <button type="button" className={styles['retryBtn']} onClick={handleRetry}>
            <RefreshCw size={13} /> {t('listening.retry')}
          </button>
        </div>
      )}

      {materialsLoading && materials.length > 0 && (
        <div className={styles['reloadHint']}>{t('listening.loading')}</div>
      )}

      {!materialsLoading && materialsError === null && materials.length === 0 && (
        <div className={styles['emptyState']}>
          <Headphones size={52} className={styles['emptyIcon']} />
          <p className={styles['emptyTitle']}>{t('listening.empty.title')}</p>
          <p className={styles['emptyHint']}>{t('listening.empty.hint')}</p>
        </div>
      )}

      {materials.length > 0 && (
        <div className={styles['grid']}>
          {materials.map((m) => (
            <MaterialCard key={m.id} material={m} />
          ))}
        </div>
      )}
    </div>
  );
}
