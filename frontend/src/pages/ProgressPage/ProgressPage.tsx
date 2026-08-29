import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy, RefreshCw, AlertCircle, BarChart2 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/store';
import { selectUser } from '@/store/Slices/AuthSlice';
import {
  fetchDashboard, requestLevelUp,
  selectProgressData, selectProgressIsLoading,
  selectProgressError, selectIsLevelingUp,
} from '@/store/Slices/ProgressSlice';
import {
  fetchRoadmap, selectRoadmapData,
  selectRoadmapLoading, selectRoadmapError,
} from '@/store/Slices/RoadmapSlice';
import type { RoadmapLevelSummary } from '@/types/roadmap/Roadmap.types';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { TopicDetailModal } from '@/components/component/roadmap/TopicDetailModal/TopicDetailModal';
import { RoadmapSection } from '@/components/component/roadmap/RoadmapSection/RoadmapSection';
import { NextTopicCallout } from '@/components/component/roadmap/NextTopicCallout/NextTopicCallout';
import { TopicList } from '@/components/component/roadmap/TopicList/TopicList';
import { LevelDrawer } from '@/components/component/roadmap/LevelDrawer/LevelDrawer';
import styles from './ProgressPage.module.css';
import { ActivityHeatmap } from '@/components/component/roadmap/ActivityHeatmap/ActivityHeatmap';
import { ModuleStatsGrid } from '@/components/component/roadmap/ModuleStatsGrid/ModuleStatsGrid';
import { ProgressStatsStrip } from '@/components/component/roadmap/ProgressStatsStrip/ProgressStatsStrip';
import { SkillBreakdownGrid } from '@/components/component/roadmap/SkillBreakdownGrid/SkillBreakdownGrid';

export default function ProgressPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const user = useAppSelector(selectUser);
  const dashData = useAppSelector(selectProgressData);
  const dashLoading = useAppSelector(selectProgressIsLoading);
  const dashError = useAppSelector(selectProgressError);
  const isLevelingUp = useAppSelector(selectIsLevelingUp);
  const roadmapData = useAppSelector(selectRoadmapData);
  const rmLoading = useAppSelector(selectRoadmapLoading);
  const rmError = useAppSelector(selectRoadmapError);

  const [selectedLevel, setSelectedLevel] = useState<RoadmapLevelSummary | null>(null);
  const [openTopicSlug, setOpenTopicSlug] = useState<string | null>(null);

  useEffect(() => {
    if (dashData === null && !dashLoading && dashError === null) void dispatch(fetchDashboard());
    if (roadmapData === null && !rmLoading && rmError === null) void dispatch(fetchRoadmap());
  }, [dashData, dashLoading, dashError, roadmapData, rmLoading, rmError, dispatch]);

  const handleRetry = useCallback(() => {
    void dispatch(fetchDashboard());
    void dispatch(fetchRoadmap());
  }, [dispatch]);

  const handleLevelUp = useCallback(() => void dispatch(requestLevelUp()), [dispatch]);

  const handleModalNavigate = useCallback(
    (url: string) => {
      setOpenTopicSlug(null);
      navigate(url);
    },
    [navigate],
  );

  if (user === null) return null;
  if ((dashLoading && !dashData) || (rmLoading && !roadmapData)) {
    return <FullPageSpinner label={t('progress.loading')} />;
  }

  const anyErr = dashError ?? rmError;
  const readiness = roadmapData?.curriculumReadinessPercent ?? 0;
  const topics = roadmapData?.currentLevelTopics ?? [];
  const recommendedSlug = roadmapData?.nextRecommendedTopicSlug ?? null;
  const isReadyForTest = dashData?.testUnlocked ?? false;
  const activeTopic = recommendedSlug ? topics.find((t2) => t2.slug === recommendedSlug) ?? null : null;

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <div className={styles['headerLeft']}>
          <div className={styles['eyebrow']}>
            <span className={styles['eyebrowDot']} />
            TOEFL
          </div>
          <h1 className={styles['pageTitle']}>{t('progress.title')}</h1>
          <p className={styles['pageSubtitle']}>{t('progress.subtitle')}</p>
        </div>
        {isReadyForTest && (
          <button type="button" className={styles['testBtn']} onClick={handleLevelUp} disabled={isLevelingUp}>
            <Trophy size={15} />
            {isLevelingUp ? t('progress.levelingUp', { defaultValue: 'Processing…' }) : t('progress.takeLevelTest')}
          </button>
        )}
      </header>

      {anyErr !== null && anyErr !== undefined && (
        <div className={styles['errBanner']}>
          <AlertCircle size={15} />
          <span>{anyErr}</span>
          <button type="button" className={styles['retryBtn']} onClick={handleRetry}>
            <RefreshCw size={13} /> {t('common.retry')}
          </button>
        </div>
      )}

      {dashData && <ProgressStatsStrip dashData={dashData} />}
      {dashData && <SkillBreakdownGrid skillBreakdown={dashData.skillBreakdown} />}
      {dashData && <ModuleStatsGrid moduleStats={dashData.moduleStats} />}

      {roadmapData && (
        <RoadmapSection roadmapData={roadmapData} readiness={readiness} onNodeClick={setSelectedLevel} />
      )}

      {activeTopic && <NextTopicCallout topic={activeTopic} onOpen={() => setOpenTopicSlug(activeTopic.slug)} />}

      {roadmapData && (
        <TopicList
          currentLevel={roadmapData.currentLevel}
          topics={topics}
          recommendedSlug={recommendedSlug}
          onOpenTopic={setOpenTopicSlug}
        />
      )}

      {dashData && <ActivityHeatmap recentActivity={dashData.recentActivity} />}

      {isReadyForTest && dashData && (
        <div className={styles['readyBanner']}>
          <Trophy size={20} className={styles['readyIco']} />
          <div>
            <strong>{t('progress.readyTitle')}</strong>
            <p>{t('progress.readyMsg', { level: dashData.currentLevel })}</p>
          </div>
          <button type="button" className={styles['readyBtn']} onClick={handleLevelUp} disabled={isLevelingUp}>
            {isLevelingUp ? t('progress.levelingUp', { defaultValue: 'Processing…' }) : `${t('progress.levelUp')} →`}
          </button>
        </div>
      )}

      {!dashData && !roadmapData && !dashLoading && !rmLoading && (anyErr === null || anyErr === undefined) && (
        <div className={styles['emptyState']}>
          <BarChart2 size={40} />
          <p>{t('progress.empty')}</p>
        </div>
      )}

      {selectedLevel && (
        <LevelDrawer
          lvl={selectedLevel}
          topics={topics}
          recommendedSlug={recommendedSlug}
          readiness={readiness}
          coreCount={roadmapData?.coreTopicsTotalCount ?? 0}
          coreMastered={roadmapData?.coreTopicsMasteredCount ?? 0}
          onClose={() => setSelectedLevel(null)}
          onLevelUp={handleLevelUp}
          isLevelingUp={isLevelingUp}
          isReadyForTest={isReadyForTest}
          onOpenTopic={setOpenTopicSlug}
        />
      )}

      {openTopicSlug !== null && (
        <TopicDetailModal slug={openTopicSlug} onClose={() => setOpenTopicSlug(null)} onNavigate={handleModalNavigate} />
      )}
    </div>
  );
}