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
  ttsMode: 'google' | 'browser' | 'loading' | 'unsupported';
  voiceLabel: string;
  isSupported: boolean;
  play: () => void;
  pause: () => void;
  stop: () => void;
  restart: () => void;
  setRate: (r: number) => void;
  currentRate: number;
}



function scoreVoice(v: SpeechSynthesisVoice, lang: string): number {
  if (v.lang.slice(0, 2).toLowerCase() !== lang.slice(0, 2).toLowerCase()) return -1;
  const n = v.name.toLowerCase();
  if (n.includes('google') && n.includes('us english')) return 100;
  if (n.includes('google') && n.includes('uk english')) return 95;
  if (n.includes('google')) return 88;
  if (n.includes('microsoft') && n.includes('neural')) return 85;
  if (n.includes('microsoft') && (n.includes('aria') || n.includes('jenny'))) return 82;
  if (n.includes('microsoft')) return 75;
  if (n.includes('samantha') || n.includes('karen') || n.includes('daniel')) return 72;
  if (v.lang === lang) return 60;
  return 40;
}

function pickBestVoice(lang: string): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const v of voices) {
    const s = scoreVoice(v, lang);
    if (s > bestScore) { bestScore = s; best = v; }
  }
  return best;
}



export function useTTS(config: TTSConfig): TTSControls {
  const { segments, fullText, materialId, pitch, lang } = config;

  const [isPlaying, setIsPlaying]               = useState(false);
  const [isPaused, setIsPaused]                 = useState(false);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(-1);
  const [hasEnded, setHasEnded]                 = useState(false);
  const [isLoading, setIsLoading]               = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [ttsMode, setTtsMode]                   = useState<'google' | 'browser' | 'loading' | 'unsupported'>('loading');
  const [currentRate, setCurrentRate]           = useState(config.rate);
  const [voiceLabel, setVoiceLabel]             = useState('');

  const audioRef         = useRef<HTMLAudioElement | null>(null);
  const browserVoiceRef  = useRef<SpeechSynthesisVoice | null>(null);
  const isPlayingRef     = useRef(false);
  const currentSegRef    = useRef(-1);
  const rateRef          = useRef(config.rate);

  const browserSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  
  useEffect(() => { rateRef.current = currentRate; }, [currentRate]);

  
  useEffect(() => {
    if (!browserSupported) return;
    let attempts = 0;
    function tryLoad() {
      const v = pickBestVoice(lang);
      if (v) { browserVoiceRef.current = v; return true; }
      return false;
    }
    if (tryLoad()) return;
    function onChange() {
      if (tryLoad()) window.speechSynthesis.removeEventListener('voiceschanged', onChange);
    }
    window.speechSynthesis.addEventListener('voiceschanged', onChange);
    const iv = setInterval(() => { if (tryLoad() || ++attempts > 20) clearInterval(iv); }, 150);
    return () => {
      clearInterval(iv);
      window.speechSynthesis.removeEventListener('voiceschanged', onChange);
    };
  }, [lang, browserSupported]);

  
  useEffect(() => {
    if (!browserSupported) return;
    const iv = setInterval(() => {
      if (isPlayingRef.current && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10_000);
    return () => clearInterval(iv);
  }, [browserSupported]);

  
  useEffect(() => {
    
    if (!materialId || !fullText) {
      if (browserSupported) {
        setTtsMode('browser');
        setVoiceLabel(browserVoiceRef.current?.name ?? 'Browser voice');
      } else {
        setTtsMode('unsupported');
      }
      setIsLoading(false);
      return;
    }

    setTtsMode('loading');
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const { data } = await listeningApi.tts(materialId, fullText, rateRef.current);

        if (data.fallback) {
          useBrowser();
          return;
        }

        const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
        audio.preload = 'auto';
        audio.playbackRate = rateRef.current;

        
        audio.ontimeupdate = () => {
          const t = audio.currentTime;
          for (let i = segments.length - 1; i >= 0; i--) {
            const seg = segments[i];
            if (seg !== undefined && t >= seg.startSec) {
              if (currentSegRef.current !== i) {
                currentSegRef.current = i;
                setActiveSegmentIdx(i);
              }
              break;
            }
          }
        };

        audio.onended = () => {
          setIsPlaying(false); setIsPaused(false); setHasEnded(true);
          setActiveSegmentIdx(-1); currentSegRef.current = -1;
          isPlayingRef.current = false;
        };

        audio.onerror = () => {
          console.warn('[useTTS] <audio> error — falling back to browser');
          useBrowser();
        };

        audioRef.current = audio;
        setTtsMode('google');
        setVoiceLabel('Google Neural2');
      } catch {
        useBrowser();
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
      if (browserSupported) window.speechSynthesis.cancel();
      setIsPlaying(false); setIsPaused(false);
      setActiveSegmentIdx(-1);
      isPlayingRef.current = false; currentSegRef.current = -1;
    };
  
  }, [materialId]); 

  function useBrowser() {
    if (browserSupported) {
      setTtsMode('browser');
      setVoiceLabel(browserVoiceRef.current?.name ?? 'Browser voice');
    } else {
      setTtsMode('unsupported');
      setVoiceLabel('Not supported');
    }
  }

  
  useEffect(() => {
    setCurrentRate(config.rate);
    rateRef.current = config.rate;
    if (audioRef.current) audioRef.current.playbackRate = config.rate;
  }, [config.rate]);

  
  
  

  const googlePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPaused) {
      
      void audio.play().then(() => { setIsPlaying(true); setIsPaused(false); isPlayingRef.current = true; });
      return;
    }
    audio.playbackRate = rateRef.current;
    void audio.play().then(() => {
      setIsPlaying(true); setIsPaused(false); setHasEnded(false);
      isPlayingRef.current = true;
    }).catch((err: unknown) => {
      setError('Playback failed. Try again.');
      console.error('[useTTS] play() error:', err);
    });
  }, [isPaused]);

  const googlePause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false); setIsPaused(true);
    isPlayingRef.current = false;
  }, []);

  const googleStop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause(); audio.currentTime = 0;
    setIsPlaying(false); setIsPaused(false); setHasEnded(false);
    setActiveSegmentIdx(-1); currentSegRef.current = -1;
    isPlayingRef.current = false;
  }, []);

  const googleRestart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.playbackRate = rateRef.current;
    void audio.play().then(() => {
      setIsPlaying(true); setIsPaused(false); setHasEnded(false);
      isPlayingRef.current = true;
    });
  }, []);

  const googleSetRate = useCallback((r: number) => {
    setCurrentRate(r); rateRef.current = r;
    if (audioRef.current) audioRef.current.playbackRate = r;
  }, []);

  
  
  

  const speakFrom = useCallback((startIdx: number, rate: number) => {
    if (!browserSupported || segments.length === 0) return;
    window.speechSynthesis.cancel();
    setTimeout(() => {
      segments.slice(startIdx).forEach((seg, offset) => {
        const realIdx = startIdx + offset;
        const utt = new SpeechSynthesisUtterance(seg.text);
        utt.rate = Math.max(0.1, Math.min(rate, 10));
        utt.pitch = Math.max(0, Math.min(pitch, 2));
        utt.lang = lang;
        if (browserVoiceRef.current) utt.voice = browserVoiceRef.current;
        utt.onstart = () => { setActiveSegmentIdx(realIdx); currentSegRef.current = realIdx; setHasEnded(false); };
        utt.onerror = (ev) => {
          if (ev.error === 'interrupted' || ev.error === 'canceled') return;
          setError(`Speech error: ${ev.error}`);
          setIsPlaying(false); setIsPaused(false); isPlayingRef.current = false;
        };
        if (realIdx === segments.length - 1) {
          utt.onend = () => {
            setIsPlaying(false); setIsPaused(false); setHasEnded(true);
            setActiveSegmentIdx(-1); currentSegRef.current = -1; isPlayingRef.current = false;
          };
        }
        window.speechSynthesis.speak(utt);
      });
      setIsPlaying(true); setIsPaused(false); setHasEnded(false);
      isPlayingRef.current = true;
    }, 80);
  }, [segments, pitch, lang, browserSupported]);

  const browserPlay = useCallback(() => {
    if (!browserSupported) return;
    if (isPaused && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true); setIsPaused(false); isPlayingRef.current = true;
      return;
    }
    if (!window.speechSynthesis.speaking) speakFrom(0, rateRef.current);
  }, [browserSupported, isPaused, speakFrom]);

  const browserPause = useCallback(() => {
    if (!browserSupported) return;
    window.speechSynthesis.pause();
    setIsPlaying(false); setIsPaused(true); isPlayingRef.current = false;
  }, [browserSupported]);

  const browserStop = useCallback(() => {
    if (!browserSupported) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false); setIsPaused(false); setHasEnded(false);
    setActiveSegmentIdx(-1); currentSegRef.current = -1; isPlayingRef.current = false;
  }, [browserSupported]);

  const browserRestart = useCallback(() => speakFrom(0, rateRef.current), [speakFrom]);

  const browserSetRate = useCallback((r: number) => {
    setCurrentRate(r); rateRef.current = r;
    if (isPlayingRef.current) {
      speakFrom(currentSegRef.current >= 0 ? currentSegRef.current : 0, r);
    }
  }, [speakFrom]);

  
  
  

  const play    = useCallback(() => ttsMode === 'google' ? googlePlay()    : browserPlay(),    [ttsMode, googlePlay, browserPlay]);
  const pause   = useCallback(() => ttsMode === 'google' ? googlePause()   : browserPause(),   [ttsMode, googlePause, browserPause]);
  const stop    = useCallback(() => ttsMode === 'google' ? googleStop()    : browserStop(),    [ttsMode, googleStop, browserStop]);
  const restart = useCallback(() => ttsMode === 'google' ? googleRestart() : browserRestart(), [ttsMode, googleRestart, browserRestart]);
  const setRate = useCallback((r: number) => ttsMode === 'google' ? googleSetRate(r) : browserSetRate(r), [ttsMode, googleSetRate, browserSetRate]);

  return {
    isPlaying, isPaused, activeSegmentIdx, hasEnded,
    isLoading, error, ttsMode, voiceLabel,
    isSupported: ttsMode !== 'unsupported',
    play, pause, stop, restart, setRate, currentRate,
  };
}