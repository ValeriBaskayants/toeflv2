import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, ArrowRight, SkipForward, Bell, RotateCcw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  skipPlacementTest,
  remindLaterPlacement,
  dismissBannerLocally,
} from '@/store/Slices/PlacementSlice';
import styles from './PlacementBanner.module.css';

const LEVEL_PREVIEW = ['A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'] as const;

export function PlacementBanner() {
  const { t }    = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { isSkipping, isReminding, status, detectedLevel, canRetake } =
    useAppSelector((s) => s.placement);

  if (status === 'COMPLETED' && !canRetake) return null;

  const isRetakeBanner = status === 'COMPLETED' && canRetake;
  const isActing       = isSkipping || isReminding;

  const handleStartTest = useCallback(() => {
    dispatch(dismissBannerLocally());
    navigate('/placement');
  }, [dispatch, navigate]);

  const handleSkip = useCallback(() => {
    void dispatch(skipPlacementTest());
  }, [dispatch]);

  const handleRemindLater = useCallback(() => {
    void dispatch(remindLaterPlacement());
  }, [dispatch]);

  return (
    <div className={`${styles['banner']} ${isRetakeBanner ? styles['bannerRetake'] : ''}`}>
      <div className={styles['glow']} aria-hidden="true" />

      <div className={styles['content']}>
        <div className={styles['left']}>
          <div className={styles['iconWrap']} aria-hidden="true">
            {isRetakeBanner ? <RotateCcw size={22} /> : <Sparkles size={22} />}
          </div>

          <div className={styles['text']}>
            <h2 className={styles['title']}>
              {isRetakeBanner
                ? t('placement.retakeNow')
                : t('placement.bannerTitle')}
            </h2>
            <p className={styles['subtitle']}>
              {isRetakeBanner
                ? t('placement.alreadyCompleted')
                : t('placement.bannerSubtitle')}
            </p>

            {!isRetakeBanner && (
              <div className={styles['levelRow']} aria-hidden="true">
                {LEVEL_PREVIEW.map((lvl) => (
                  <span key={lvl} className={styles['levelPill']}>{lvl}</span>
                ))}
                <span className={styles['levelArrow']}>{t('placement.bannerLevelArrow')}</span>
              </div>
            )}

            {isRetakeBanner && detectedLevel !== null && (
              <p className={styles['previousLevel']}>
                {t('placement.previousLevel', { level: detectedLevel.replace('_PLUS', '+') })}
              </p>
            )}
          </div>
        </div>

        <div className={styles['actions']}>
          <button
            type="button"
            className={styles['primaryBtn']}
            onClick={handleStartTest}
            disabled={isActing}
          >
            <span>
              {isRetakeBanner ? t('placement.retakeNow') : t('placement.startTest')}
            </span>
            <ArrowRight size={16} />
          </button>

          {!isRetakeBanner && (
            <button
              type="button"
              className={styles['secondaryBtn']}
              onClick={handleRemindLater}
              disabled={isActing}
              aria-label={t('placement.remindLater')}
            >
              {isReminding
                ? <span className={styles['spinner']} />
                : <Bell size={14} />}
              {t('placement.remindLater')}
            </button>
          )}

          {!isRetakeBanner && (
            <button
              type="button"
              className={styles['skipBtn']}
              onClick={handleSkip}
              disabled={isActing}
              aria-label={t('placement.skipToA1')}
            >
              {isSkipping
                ? <span className={styles['spinner']} />
                : <SkipForward size={13} />}
              {t('placement.skipToA1')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}