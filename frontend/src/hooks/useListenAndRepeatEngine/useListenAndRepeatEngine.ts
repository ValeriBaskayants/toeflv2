import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  submitSpeakingAttempt,
  finishSpeakingSession,
  advanceSpeakingItem,
} from '@/store/Slices/SpeakingRepeatSlice';
import { speakingRepeatApi } from '@/api/services/speaking-repeat';
import {
  RESPONSE_WINDOW_SEC,
  PAUSE_BEFORE_BEEP_MS,
  BEEP_DURATION_MS,
  GET_READY_MS,
  ITEM_DONE_DISPLAY_MS,
} from '@/constants/speaking-constants';

export type EnginePhase =
  | 'idle'
  | 'requesting_mic'
  | 'get_ready'
  | 'loading_audio'
  | 'playing'
  | 'pausing'
  | 'beep'
  | 'recording'
  | 'submitting'
  | 'item_done'
  | 'finishing'
  | 'complete'
  | 'error';

interface EngineState {
  phase: EnginePhase;
  timeLeft: number;
  errorMessage: string | null;
}

function playBeepTone(): Promise<void> {
  return new Promise((resolve) => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.15;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    window.setTimeout(() => {
      oscillator.stop();
      void ctx.close();
      resolve();
    }, BEEP_DURATION_MS);
  });
}

function pickSupportedMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return '';
}

export function useListenAndRepeatEngine(setId: string) {
  const dispatch = useAppDispatch();
  const sessionId = useAppSelector((s) => s.speakingRepeat.sessionId);
  const items = useAppSelector((s) => s.speakingRepeat.items);
  const currentIndex = useAppSelector((s) => s.speakingRepeat.currentIndex);
  const review = useAppSelector((s) => s.speakingRepeat.review);

  const [state, setState] = useState<EngineState>({
    phase: 'idle',
    timeLeft: RESPONSE_WINDOW_SEC,
    errorMessage: null,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const isSubmittingRef = useRef(false);

  const currentItem = items[currentIndex] ?? null;

  const safeSetState = useCallback((updater: EngineState | ((prev: EngineState) => EngineState)) => {
    if (mountedRef.current) {
      setState(updater);
    }
  }, []);

  const clearCountdownTimer = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const releaseMic = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearCountdownTimer();
      releaseMic();
      recorderRef.current = null;
    };
  }, [clearCountdownTimer, releaseMic]);

  const handleSubmit = useCallback(
    async (blob: Blob) => {
      if (isSubmittingRef.current || currentItem === null) return;
      isSubmittingRef.current = true;

      safeSetState((prev) => ({ ...prev, phase: 'submitting' }));

      try {
        await dispatch(submitSpeakingAttempt({ itemId: currentItem.id, audioBlob: blob })).unwrap();
        safeSetState((prev) => ({ ...prev, phase: 'item_done' }));

        window.setTimeout(() => {
          isSubmittingRef.current = false;
          if (!mountedRef.current) return;

          const isLastItem = currentIndex >= items.length - 1;

          if (isLastItem) {
            safeSetState((prev) => ({ ...prev, phase: 'finishing' }));
            dispatch(finishSpeakingSession())
              .unwrap()
              .then(() => {
                safeSetState((prev) => ({ ...prev, phase: 'complete' }));
              })
              .catch(() => {
                safeSetState((prev) => ({ ...prev, phase: 'error', errorMessage: 'finish_failed' }));
              });
          } else {
            dispatch(advanceSpeakingItem());
            safeSetState({ phase: 'get_ready', timeLeft: RESPONSE_WINDOW_SEC, errorMessage: null });
          }
        }, ITEM_DONE_DISPLAY_MS);
      } catch (err: unknown) {
        isSubmittingRef.current = false;
        const status = err !== null && typeof err === 'object' && 'status' in err
          ? (err as { status?: number }).status
          : undefined;

        safeSetState((prev) => ({
          ...prev,
          phase: 'error',
          errorMessage: status === 403 ? 'quota_exceeded' : 'submit_failed',
        }));
      }
    },
    [currentItem, currentIndex, items.length, dispatch, safeSetState],
  );

  const startRecording = useCallback(() => {
    if (streamRef.current === null || currentItem === null) return;

    chunksRef.current = [];
    const mimeType = pickSupportedMimeType();
    const recorder = new MediaRecorder(streamRef.current, mimeType.length > 0 ? { mimeType } : undefined);

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      void handleSubmit(blob);
    };

    recorderRef.current = recorder;
    recorder.start();

    safeSetState((prev) => ({ ...prev, phase: 'recording', timeLeft: RESPONSE_WINDOW_SEC }));

    let remaining = RESPONSE_WINDOW_SEC;
    timerIntervalRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearCountdownTimer();
        recorderRef.current?.stop();
        return;
      }
      safeSetState((prev) => ({ ...prev, timeLeft: remaining }));
    }, 1000);
  }, [currentItem, safeSetState, clearCountdownTimer, handleSubmit]);

  const runBeepAndRecord = useCallback(() => {
    safeSetState((prev) => ({ ...prev, phase: 'pausing' }));
    window.setTimeout(() => {
      if (!mountedRef.current) return;
      safeSetState((prev) => ({ ...prev, phase: 'beep' }));
      void playBeepTone().then(() => {
        if (!mountedRef.current) return;
        startRecording();
      });
    }, PAUSE_BEFORE_BEEP_MS);
  }, [safeSetState, startRecording]);

  const loadAndPlayAudio = useCallback(async () => {
    if (currentItem === null || sessionId === null) return;

    safeSetState((prev) => ({ ...prev, phase: 'loading_audio', errorMessage: null }));

    try {
      const audio = await speakingRepeatApi.getItemAudio(setId, currentItem.id);
      if (!mountedRef.current) return;

      const audioElement = new Audio(`data:audio/mp3;base64,${audio.audioBase64}`);
      audioElementRef.current = audioElement;

      audioElement.onended = () => {
        runBeepAndRecord();
      };

      audioElement.onerror = () => {
        safeSetState((prev) => ({ ...prev, phase: 'error', errorMessage: 'audio_playback_failed' }));
      };

      safeSetState((prev) => ({ ...prev, phase: 'playing' }));
      await audioElement.play();
    } catch {
      if (mountedRef.current) {
        safeSetState((prev) => ({ ...prev, phase: 'error', errorMessage: 'audio_load_failed' }));
      }
    }
  }, [currentItem, sessionId, setId, safeSetState, runBeepAndRecord]);

  useEffect(() => {
    if (state.phase === 'get_ready' && currentItem !== null) {
      const timeoutId = window.setTimeout(() => {
        void loadAndPlayAudio();
      }, GET_READY_MS);
      return () => window.clearTimeout(timeoutId);
    }
    return undefined;
  }, [state.phase, currentIndex, currentItem, loadAndPlayAudio]);

  const begin = useCallback(async () => {
    safeSetState((prev) => ({ ...prev, phase: 'requesting_mic', errorMessage: null }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      safeSetState((prev) => ({ ...prev, phase: 'get_ready' }));
    } catch {
      safeSetState((prev) => ({ ...prev, phase: 'error', errorMessage: 'microphone_denied' }));
    }
  }, [safeSetState]);

  const retry = useCallback(() => {
    isSubmittingRef.current = false;
    clearCountdownTimer();
    if (streamRef.current === null) {
      safeSetState({ phase: 'idle', timeLeft: RESPONSE_WINDOW_SEC, errorMessage: null });
    } else {
      safeSetState({ phase: 'get_ready', timeLeft: RESPONSE_WINDOW_SEC, errorMessage: null });
    }
  }, [clearCountdownTimer, safeSetState]);

  return {
    phase: state.phase,
    timeLeft: state.timeLeft,
    errorMessage: state.errorMessage,
    currentItem,
    currentIndex,
    totalItems: items.length,
    review,
    begin,
    retry,
  };
}