import { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import styles from './InlineAudioPlayer.module.css';

interface InlineAudioPlayerProps {
  src: string;
  label?: string;
}

export function InlineAudioPlayer({ src, label }: InlineAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const onTime = () => {
      if (audio.duration > 0) setProgress(audio.currentTime / audio.duration);
    };
    const onLoaded = () => setDuration(audio.duration);
    const onEnd = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    const onError = () => setHasError(true);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onError);
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || hasError) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      void audio.play().catch(() => setHasError(true));
      setIsPlaying(true);
    }
  };

  if (hasError) {
    return <span className={styles['errorLabel']}>—</span>;
  }

  const formattedDuration = Number.isFinite(duration) && duration > 0 ? `${Math.round(duration)}s` : '';

  return (
    <div className={styles['player']}>
      <button type="button" className={styles['playBtn']} onClick={toggle} aria-label={label ?? 'Play audio'}>
        {isPlaying ? <Pause size={13} /> : <Play size={13} style={{ marginLeft: 1 }} />}
      </button>
      <div className={styles['track']}>
        <div className={styles['trackFill']} style={{ width: `${progress * 100}%` }} />
      </div>
      {formattedDuration && <span className={styles['duration']}>{formattedDuration}</span>}
    </div>
  );
}