import { useState, useEffect, useCallback } from 'react';
import type { ListeningSegment } from '@/types/listening/Listening.types';

export interface TTSConfig {
  segments: ListeningSegment[];
  rate: number;
  pitch: number;
  lang: string;
}

export interface TTSControls {
  isPlaying: boolean;
  activeSegmentIdx: number;
  hasEnded: boolean;
  isSupported: boolean;
  voiceQuality: 'premium' | 'standard' | 'basic' | 'none';
  voiceName: string;
  availableVoices: SpeechSynthesisVoice[];
  play: () => void;
  pause: () => void;
  stop: () => void;
  restart: () => void;
  setRate: (r: number) => void;
  currentRate: number;
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

function getVoiceQuality(
  voice: SpeechSynthesisVoice | null,
  lang: string,
): 'premium' | 'standard' | 'basic' | 'none' {
  if (!voice) return 'none';
  const score = rankVoice(voice, lang);
  if (score >= 85) return 'premium';
  if (score >= 60) return 'standard';
  return 'basic';
}

export function useTTS(config: TTSConfig): TTSControls {
  const { segments, pitch, lang } = config;

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(-1);
  const [hasEnded, setHasEnded] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [currentRate, setCurrentRate] = useState(config.rate);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        setAvailableVoices(v);
        setSelectedVoice(selectBestVoice(v, lang));
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [isSupported, lang]);

  useEffect(() => {
    setCurrentRate(config.rate);
  }, [config.rate]);

  useEffect(() => {
    return () => {
      if (isSupported) window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  const speakFrom = useCallback(
    (startIdx: number, rate: number) => {
      if (!isSupported || segments.length === 0) return;

      window.speechSynthesis.cancel();

      const slice = segments.slice(startIdx);

      slice.forEach((seg, offset) => {
        const realIdx = startIdx + offset;
        const u = new SpeechSynthesisUtterance(seg.text);
        u.rate = rate;
        u.pitch = pitch;
        u.lang = lang;
        if (selectedVoice) u.voice = selectedVoice;

        u.onstart = () => {
          setActiveSegmentIdx(realIdx);
          setHasEnded(false);
        };

        if (realIdx === segments.length - 1) {
          u.onend = () => {
            setIsPlaying(false);
            setHasEnded(true);
            setActiveSegmentIdx(-1);
          };
        }

        window.speechSynthesis.speak(u);
      });

      setIsPlaying(true);
      setHasEnded(false);
    },
    [isSupported, segments, pitch, lang, selectedVoice],
  );

  const play = useCallback(() => {
    if (!isSupported) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
    } else if (!window.speechSynthesis.speaking) {
      speakFrom(0, currentRate);
    }
  }, [isSupported, speakFrom, currentRate]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    setIsPlaying(false);
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setActiveSegmentIdx(-1);
    setHasEnded(false);
  }, [isSupported]);

  const restart = useCallback(() => {
    if (!isSupported) return;
    speakFrom(0, currentRate);
  }, [isSupported, speakFrom, currentRate]);

  const setRate = useCallback(
    (r: number) => {
      setCurrentRate(r);

      if (isPlaying) {
        const fromIdx = activeSegmentIdx >= 0 ? activeSegmentIdx : 0;
        speakFrom(fromIdx, r);
      }
    },
    [isPlaying, activeSegmentIdx, speakFrom],
  );

  const voiceQuality = getVoiceQuality(selectedVoice, lang);
  const voiceName = selectedVoice?.name ?? '';

  return {
    isPlaying,
    activeSegmentIdx,
    hasEnded,
    isSupported,
    voiceQuality,
    voiceName,
    availableVoices,
    play,
    pause,
    stop,
    restart,
    setRate,
    currentRate,
  };
}
