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
  activeSegmentIdx: number;
  hasEnded: boolean;
  ttsMode: 'elevenlabs' | 'browser' | 'loading' | 'unsupported';
  isLoading: boolean;
  error: string | null;
  play: () => void;
  pause: () => void;
  stop: () => void;
  restart: () => void;
  setRate: (r: number) => void;
  currentRate: number;
  voiceQuality: 'premium' | 'standard' | 'basic' | 'none';
  voiceName: string;
  isSupported: boolean;
  currentTime: number;
}

function rankVoice(v: SpeechSynthesisVoice, lang: string): number {
  const langBase = lang.slice(0, 2).toLowerCase();
  const vLang = v.lang.slice(0, 2).toLowerCase();
  if (vLang !== langBase) return -1;

  const name = v.name.toLowerCase();

  if (name.includes('google') && name.includes('us english')) return 100;
  if (name.includes('google') && name.includes('uk english')) return 95;
  if (name.includes('google')) return 90;

  if (name.includes('microsoft') && (name.includes('aria') || name.includes('jenny'))) return 88;
  if (name.includes('microsoft') && name.includes('neural')) return 85;
  if (name.includes('microsoft')) return 80;

  if (name.includes('samantha') || name.includes('alex') || name.includes('karen')) return 78;

  if (v.lang === lang) return 60;
  if (vLang === langBase) return 40;
  return -1;
}

function selectBestVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | null {
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const v of voices) {
    const score = rankVoice(v, lang);
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best;
}

export function useTTS(config: TTSConfig): TTSControls {
  const { segments, fullText, materialId, pitch, lang } = config;

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(-1);
  const [hasEnded, setHasEnded] = useState(false);
  const [ttsMode, setTtsMode] = useState<'elevenlabs' | 'browser' | 'loading' | 'unsupported'>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRate, setCurrentRate] = useState(config.rate);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBase64Ref = useRef<string | null>(null);
  const browserVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const isSpeechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

    if (isSpeechSupported) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          browserVoiceRef.current = selectBestVoice(voices, lang);
        }
      };
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    }

    setIsLoading(true);
    setTtsMode('loading');

    void (async () => {
      try {
        const { data } = await listeningApi.tts(materialId, fullText, config.rate);

        if (data.fallback) {
          if (!isSpeechSupported) {
            setTtsMode('unsupported');
          } else {
            setTtsMode('browser');
          }
          return;
        }

        const audioEl = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
        audioEl.preload = 'auto';

        audioEl.onended = () => {
          setIsPlaying(false);
          setHasEnded(true);
          setActiveSegmentIdx(-1);
          isPlayingRef.current = false;
        };

        audioEl.onerror = () => {
          setError('Audio playback error. Switching to browser TTS.');
          setTtsMode('browser');
          setIsPlaying(false);
        };

        audioEl.ontimeupdate = () => {
          const currentAudioTime = audioEl.currentTime;
          setCurrentTime(currentAudioTime);

          for (let i = segments.length - 1; i >= 0; i--) {
            const seg = segments[i];
            if (seg !== undefined && currentAudioTime >= seg.startSec) {
              setActiveSegmentIdx(i);
              break;
            }
          }
        };

        audioRef.current = audioEl;
        audioBase64Ref.current = data.audioBase64;
        setTtsMode('elevenlabs');
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'TTS request failed';
        console.warn('[useTTS] ElevenLabs fetch failed, falling back to browser TTS:', message);

        if (!isSpeechSupported) {
          setTtsMode('unsupported');
        } else {
          setTtsMode('browser');
        }
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
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.removeEventListener('voiceschanged', () => { });
      }
    };

  }, [materialId]);

  useEffect(() => {
    setCurrentRate(config.rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = config.rate;
    }
  }, [config.rate]);

  const elevenlabsPlay = useCallback(() => {
    const audioEl = audioRef.current;
    if (audioEl === null) return;

    audioEl.playbackRate = currentRate;

    void audioEl.play().then(() => {
      setIsPlaying(true);
      setHasEnded(false);
      isPlayingRef.current = true;
    }).catch((err: unknown) => {
      console.error('[useTTS] Audio play failed:', err);
      setError('Playback failed. Try again.');
    });
  }, [currentRate]);

  const elevenlabsPause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, []);

  const elevenlabsStop = useCallback(() => {
    const audioEl = audioRef.current;
    if (audioEl === null) return;
    audioEl.pause();
    audioEl.currentTime = 0;
    setIsPlaying(false);
    setHasEnded(false);
    setActiveSegmentIdx(-1);
    isPlayingRef.current = false;
  }, []);

  const elevenlabsRestart = useCallback(() => {
    const audioEl = audioRef.current;
    if (audioEl === null) return;
    audioEl.currentTime = 0;
    audioEl.playbackRate = currentRate;
    void audioEl.play().then(() => {
      setIsPlaying(true);
      setHasEnded(false);
      isPlayingRef.current = true;
    });
  }, [currentRate]);

  const elevenlabsSetRate = useCallback((r: number) => {
    setCurrentRate(r);
    if (audioRef.current) {
      audioRef.current.playbackRate = r;
    }
  }, []);

  const speakFromBrowser = useCallback(
    (startIdx: number, rate: number) => {
      if (!('speechSynthesis' in window) || segments.length === 0) return;

      window.speechSynthesis.cancel();

      const slice = segments.slice(startIdx);

      slice.forEach((seg, offset) => {
        const realIdx = startIdx + offset;
        const u = new SpeechSynthesisUtterance(seg.text);

        u.rate = rate;
        u.pitch = pitch;
        u.lang = lang;

        if (browserVoiceRef.current !== null) {
          u.voice = browserVoiceRef.current;
        }

        u.onstart = () => {
          setActiveSegmentIdx(realIdx);
          setHasEnded(false);
        };

        if (realIdx === segments.length - 1) {
          u.onend = () => {
            setIsPlaying(false);
            setHasEnded(true);
            setActiveSegmentIdx(-1);
            isPlayingRef.current = false;
          };
        }

        window.speechSynthesis.speak(u);
      });

      setIsPlaying(true);
      setHasEnded(false);
      isPlayingRef.current = true;
    },
    [segments, pitch, lang],
  );

  const browserPlay = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      isPlayingRef.current = true;
    } else if (!window.speechSynthesis.speaking) {
      speakFromBrowser(0, currentRate);
    }
  }, [speakFromBrowser, currentRate]);

  const browserPause = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.pause();
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, []);

  const browserStop = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setActiveSegmentIdx(-1);
    setHasEnded(false);
    isPlayingRef.current = false;
  }, []);

  const browserRestart = useCallback(() => {
    speakFromBrowser(0, currentRate);
  }, [speakFromBrowser, currentRate]);

  const browserSetRate = useCallback(
    (r: number) => {
      setCurrentRate(r);
      if (isPlayingRef.current) {
        const fromIdx = activeSegmentIdx >= 0 ? activeSegmentIdx : 0;
        speakFromBrowser(fromIdx, r);
      }
    },
    [activeSegmentIdx, speakFromBrowser],
  );

  const play = useCallback(() => {
    if (ttsMode === 'elevenlabs') return elevenlabsPlay();
    if (ttsMode === 'browser') return browserPlay();
  }, [ttsMode, elevenlabsPlay, browserPlay]);

  const pause = useCallback(() => {
    if (ttsMode === 'elevenlabs') return elevenlabsPause();
    if (ttsMode === 'browser') return browserPause();
  }, [ttsMode, elevenlabsPause, browserPause]);

  const stop = useCallback(() => {
    if (ttsMode === 'elevenlabs') return elevenlabsStop();
    if (ttsMode === 'browser') return browserStop();
  }, [ttsMode, elevenlabsStop, browserStop]);

  const restart = useCallback(() => {
    if (ttsMode === 'elevenlabs') return elevenlabsRestart();
    if (ttsMode === 'browser') return browserRestart();
  }, [ttsMode, elevenlabsRestart, browserRestart]);

  const setRate = useCallback(
    (r: number) => {
      if (ttsMode === 'elevenlabs') return elevenlabsSetRate(r);
      if (ttsMode === 'browser') return browserSetRate(r);
    },
    [ttsMode, elevenlabsSetRate, browserSetRate],
  );

  const isSupported = ttsMode !== 'unsupported';
  let voiceQuality: 'premium' | 'standard' | 'basic' | 'none' = 'none';
  let voiceName = '';

  if (ttsMode === 'elevenlabs') {
    voiceQuality = 'premium';
    voiceName = 'ElevenLabs AI';
  } else if (ttsMode === 'browser') {
    voiceQuality = 'basic';
    voiceName = browserVoiceRef.current?.name || 'Browser Built-in';
  }

  return {
    isPlaying,
    activeSegmentIdx,
    hasEnded,
    ttsMode,
    isLoading,
    error,
    play,
    pause,
    stop,
    restart,
    setRate,
    currentRate,
    voiceQuality,
    voiceName,
    isSupported,
    currentTime,
  };
}