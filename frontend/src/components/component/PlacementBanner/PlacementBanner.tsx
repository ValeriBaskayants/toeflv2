import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, SkipForward, Bell } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  skipPlacementTest,
  remindLaterPlacement,
  dismissBannerLocally,
} from '@/store/Slices/PlacementSlice';
import styles from './PlacementBanner.module.css';

// ─── Level preview pills ───────────────────────────────────────────────────────

const LEVEL_PREVIEW = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function PlacementBanner() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { isSkipping, isReminding } = useAppSelector((state) => state.placement);

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

  const isActing = isSkipping || isReminding;

  return (
    <div className={styles['banner']}>
      {/* Decorative background glow */}
      <div className={styles['glow']} aria-hidden="true" />

      <div className={styles['content']}>
        {/* Left: icon + text */}
        <div className={styles['left']}>
          <div className={styles['iconWrap']} aria-hidden="true">
            <Sparkles size={22} />
          </div>

          <div className={styles['text']}>
            <h2 className={styles['title']}>Find your true starting level</h2>
            <p className={styles['subtitle']}>
              Take a short adaptive test (5–10 min) so you start exactly where you belong — not too
              easy, not too hard.
            </p>

            {/* Level pills — shows the range visually */}
            <div className={styles['levelRow']} aria-hidden="true">
              {LEVEL_PREVIEW.map((lvl) => (
                <span key={lvl} className={styles['levelPill']}>
                  {lvl}
                </span>
              ))}
              <span className={styles['levelArrow']}>← where will you land?</span>
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className={styles['actions']}>
          <button
            type="button"
            className={styles['primaryBtn']}
            onClick={handleStartTest}
            disabled={isActing}
          >
            <span>Start the test</span>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            className={styles['secondaryBtn']}
            onClick={handleRemindLater}
            disabled={isActing}
            aria-label="Remind me in 4 days"
          >
            {isReminding ? <span className={styles['spinner']} /> : <Bell size={14} />}
            Remind me later
          </button>

          <button
            type="button"
            className={styles['skipBtn']}
            onClick={handleSkip}
            disabled={isActing}
            aria-label="Skip placement test and start at A1"
          >
            {isSkipping ? <span className={styles['spinner']} /> : <SkipForward size={13} />}
            Skip — start at A1
          </button>
        </div>
      </div>
    </div>
  );
}
