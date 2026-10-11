import { useCallback, useEffect, useRef, useState } from 'react';

export type PlaybackState = 'idle' | 'playing' | 'ended' | 'blocked' | 'error';

interface Options {
  url: string | null;
  volume: number;
  autoPlay: boolean;
  onEnded?: () => void;
}

export interface ListeningPlayer {
  state: PlaybackState;
  currentSec: number;
  durationSec: number;
  completedPlays: number;
  start: () => Promise<void>;
}

export function useListeningAudio({ url, volume, autoPlay, onEnded }: Options): ListeningPlayer {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onEndedRef = useRef(onEnded);
  const volumeRef = useRef(volume);

  const [state, setState] = useState<PlaybackState>('idle');
  const [currentSec, setCurrentSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [completedPlays, setCompletedPlays] = useState(0);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    volumeRef.current = volume;
    if (audioRef.current !== null) audioRef.current.volume = volume;
  }, [volume]);

  const start = useCallback(async (): Promise<void> => {
    const audio = audioRef.current;
    if (audio === null) return;
    audio.currentTime = 0;
    setCurrentSec(0);
    try {
      await audio.play();
      if (audioRef.current === audio) setState('playing');
    } catch (err: unknown) {
      if (audioRef.current !== audio) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setState(err instanceof DOMException && err.name === 'NotAllowedError' ? 'blocked' : 'error');
    }
  }, []);

  useEffect(() => {
    if (url === null) return undefined;

    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.volume = volumeRef.current;
    audioRef.current = audio;
    setState('idle');
    setCurrentSec(0);
    setDurationSec(0);
    setCompletedPlays(0);

    const handleEnded = (): void => {
      setState('ended');
      setCompletedPlays((n) => n + 1);
      onEndedRef.current?.();
    };
    const handleTime = (): void => setCurrentSec(audio.currentTime);
    const handleMeta = (): void => setDurationSec(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handlePlaying = (): void => setState('playing');
    const handleError = (): void => setState('error');

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTime);
    audio.addEventListener('loadedmetadata', handleMeta);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('error', handleError);

    if (autoPlay) void start();

    return () => {
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTime);
      audio.removeEventListener('loadedmetadata', handleMeta);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('error', handleError);
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [url, autoPlay, start]);

  return { state, currentSec, durationSec, completedPlays, start };
}