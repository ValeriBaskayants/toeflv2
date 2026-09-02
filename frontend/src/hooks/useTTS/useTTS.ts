import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ListeningSegment } from '@/types/listening/Listening.types';
import { listeningApi } from '@/api/services/listening';

export interface TTSConfig {
  segments: ListeningSegment[];
  fullText: string;
  materialId: string;
  rate: number;
  pitch: number;
  lang: string;
}

export interface TTSControls {
  isPlaying: boolean;
  isPaused: boolean;
  activeSegmentIdx: number;
  hasEnded: boolean;
  isLoading: boolean;
  error: string | null;
  ttsMode: 'azure' | 'loading' | 'error';
  voiceLabel: string;
  isSupported: true;
  play: () => void;
  pause: () => void;
  stop: () => void;
  restart: () => void;
  setRate: (r: number) => void;
  currentRate: number;
}

const KNOWN_FALLBACK_REASONS = [
  'api_key_not_configured',
  'rate_limited',
  'unauthorized',
  'timeout',
  'network_error',
] as const;

export function useTTS(config: TTSConfig): TTSControls {
  const { segments, fullText, materialId } = config;
  const { t } = useTranslation();

  const [isPlaying, setIsPlaying]               = useState(false);
  const [isPaused, setIsPaused]                 = useState(false);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(-1);
  const [hasEnded, setHasEnded]                 = useState(false);
  const [isLoading, setIsLoading]               = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [ttsMode, setTtsMode]                   = useState<'azure' | 'loading' | 'error'>('loading');
  const [currentRate, setCurrentRate]           = useState(config.rate);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rateRef  = useRef(config.rate);
  const langRef  = useRef(config.lang);
  const segRef   = useRef(segments);

  useEffect(() => { rateRef.current = config.rate; }, [config.rate]);
  useEffect(() => { langRef.current = config.lang; }, [config.lang]);
  useEffect(() => { segRef.current  = segments;    }, [segments]);

  const translateFallbackReason = useCallback(
    (reason?: string): string => {
      const key = KNOWN_FALLBACK_REASONS.includes(reason as (typeof KNOWN_FALLBACK_REASONS)[number])
        ? reason
        : 'default';
      return t(`listening.player.ttsFallbackReasons.${key}`);
    },
    [t],
  );

  // Загрузка аудио заново только при смене материала — язык/скорость на это
  // намеренно не влияют (см. langRef/rateRef ниже), чтобы не перезапрашивать
  // TTS впустую при каждом ререндере.
  useEffect(() => {
    if (!materialId || !fullText) {
      setTtsMode('error');
      setError(t('listening.player.noContent'));
      setIsLoading(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    setTtsMode('loading');
    setIsLoading(true);
    setIsPlaying(false);
    setIsPaused(false);
    setHasEnded(false);
    setActiveSegmentIdx(-1);
    setError(null);

    void (async () => {
      try {
        const { data } = await listeningApi.tts(
          materialId,
          fullText,
          rateRef.current,
          langRef.current,
        );

        if (data.fallback) {
          setTtsMode('error');
          setError(translateFallbackReason(data.reason));
          return;
        }

        const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
        audio.preload = 'auto';
        audio.playbackRate = rateRef.current;

        audio.ontimeupdate = () => {
          const time = audio.currentTime;
          const segs = segRef.current;
          for (let i = segs.length - 1; i >= 0; i--) {
            const seg = segs[i];
            if (seg !== undefined && time >= seg.startSec) {
              setActiveSegmentIdx((prev) => (prev !== i ? i : prev));
              break;
            }
          }
        };

        audio.onplay = () => {
          setIsPlaying(true);
          setIsPaused(false);
          setHasEnded(false);
        };

        audio.onpause = () => {
          if (!audio.ended) {
            setIsPlaying(false);
            setIsPaused(true);
          }
        };

        audio.onended = () => {
          setIsPlaying(false);
          setIsPaused(false);
          setHasEnded(true);
          setActiveSegmentIdx(-1);
        };

        audio.onerror = () => {
          setTtsMode('error');
          setError(t('listening.player.audioPlaybackError'));
          setIsPlaying(false);
          setIsPaused(false);
        };

        audioRef.current = audio;
        setTtsMode('azure');
        setError(null);
      } catch (err) {
        setTtsMode('error');
        setError(err instanceof Error ? err.message : t('listening.player.ttsFallbackReasons.default'));
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      setIsPlaying(false);
      setIsPaused(false);
      setActiveSegmentIdx(-1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId]);

  useEffect(() => {
    setCurrentRate(config.rate);
    rateRef.current = config.rate;
    if (audioRef.current) {
      audioRef.current.playbackRate = config.rate;
    }
  }, [config.rate]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rateRef.current;
    void audio.play().catch(() => {
      setError(t('listening.player.playbackFailed'));
    });
  }, [t]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;
    audio.pause();
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setIsPaused(false);
    setHasEnded(false);
    setActiveSegmentIdx(-1);
  }, []);

  const restart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.playbackRate = rateRef.current;
    void audio.play().catch(() => {
      setError(t('listening.player.playbackFailed'));
    });
  }, [t]);

  const setRate = useCallback((r: number) => {
    setCurrentRate(r);
    rateRef.current = r;
    if (audioRef.current) {
      audioRef.current.playbackRate = r;
    }
  }, []);

  return {
    isPlaying,
    isPaused,
    activeSegmentIdx,
    hasEnded,
    isLoading,
    error,
    ttsMode,
    voiceLabel: t('listening.player.voiceAzure'),
    isSupported: true,
    play,
    pause,
    stop,
    restart,
    setRate,
    currentRate,
  };
}