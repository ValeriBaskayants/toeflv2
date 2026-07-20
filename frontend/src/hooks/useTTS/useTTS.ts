


import { useState, useEffect, useCallback, useRef } from 'react';
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
  ttsMode: 'google' | 'loading' | 'error';
  voiceLabel: string;
  isSupported: true;
  play: () => void;
  pause: () => void;
  stop: () => void;
  restart: () => void;
  setRate: (r: number) => void;
  currentRate: number;
}

export function useTTS(config: TTSConfig): TTSControls {
  const { segments, fullText, materialId } = config;

  const [isPlaying, setIsPlaying]               = useState(false);
  const [isPaused, setIsPaused]                 = useState(false);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(-1);
  const [hasEnded, setHasEnded]                 = useState(false);
  const [isLoading, setIsLoading]               = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [ttsMode, setTtsMode]                   = useState<'google' | 'loading' | 'error'>('loading');
  const [currentRate, setCurrentRate]           = useState(config.rate);

  
  const audioRef   = useRef<HTMLAudioElement | null>(null);
  const rateRef    = useRef(config.rate);
  const segRef     = useRef(segments); 

  
  useEffect(() => { rateRef.current = config.rate; }, [config.rate]);
  useEffect(() => { segRef.current = segments; },    [segments]);

  
  useEffect(() => {
    if (!materialId || !fullText) {
      setTtsMode('error');
      setError('No audio content available');
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
        const { data } = await listeningApi.tts(materialId, fullText, rateRef.current);

        if (data.fallback) {
          setTtsMode('error');
          setError(
            'Google TTS is not configured. Please add GOOGLE_TTS_API_KEY to backend .env',
          );
          return;
        }

        const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
        audio.preload = 'auto';
        audio.playbackRate = rateRef.current;

        
        audio.ontimeupdate = () => {
          const t = audio.currentTime;
          const segs = segRef.current;
          for (let i = segs.length - 1; i >= 0; i--) {
            const seg = segs[i];
            if (seg !== undefined && t >= seg.startSec) {
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
          setError('Audio playback error. Try reloading the page.');
          setIsPlaying(false);
          setIsPaused(false);
        };

        audioRef.current = audio;
        setTtsMode('google');
        setError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'TTS request failed';
        setTtsMode('error');
        setError(msg);
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

    void audio.play().catch((err: unknown) => {
      console.error('[useTTS] play() failed:', err);
      setError('Playback failed. Click play again.');
    });
    
    
  }, []);

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
    void audio.play().catch((err: unknown) => {
      console.error('[useTTS] restart play() failed:', err);
    });
  }, []);

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
    voiceLabel: 'Google Neural2',
    isSupported: true,
    play,
    pause,
    stop,
    restart,
    setRate,
    currentRate,
  };
}