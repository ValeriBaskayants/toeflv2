import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicSpeakingItem } from '@/types/speaking/Speaking.types';
import {
  PAUSE_BEFORE_BEEP_MS,
  BEEP_DURATION_MS,
  UPLOAD_MAX_RETRIES,
  UPLOAD_RETRY_DELAY_MS,
} from '@/constants/speaking-repeat-constants';
import { playBeepTone } from './beep';
import { pickSupportedMimeType } from './mimeType';

export type FlowPhase =
  | 'idle'
  | 'requesting-mic'
  | 'mic-denied'
  | 'unsupported'
  | 'loading-audio'
  | 'audio-error'
  | 'playing-prompt'
  | 'pre-beep-pause'
  | 'beep'
  | 'recording'
  | 'submitting'
  | 'submit-failed'
  | 'all-done';

export type MicErrorReason = 'permission_denied' | 'no_microphone' | 'device_busy' | 'unknown';

export interface UseSpeakingRepeatFlowParams {
  items: PublicSpeakingItem[];
  fetchItemAudio: (itemId: string) => Promise<{ audioBase64: string }>;
  submitAttempt: (itemId: string, blob: Blob, mimeType: string) => Promise<unknown>;
  onAllDone: () => void;
}

export interface UseSpeakingRepeatFlowResult {
  phase: FlowPhase;
  currentIndex: number;
  currentItem: PublicSpeakingItem | null;
  secondsLeft: number;
  micStream: MediaStream | null;
  micErrorReason: MicErrorReason | null;
  start: () => void;
  retryAudioLoad: () => void;
  reset: () => void;
}

function describeMicError(err: unknown): MicErrorReason {
  const name = err instanceof DOMException ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'permission_denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'no_microphone';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'device_busy';
    default:
      return 'unknown';
  }
}

export function useSpeakingRepeatFlow(params: UseSpeakingRepeatFlowParams): UseSpeakingRepeatFlowResult {
  const { items, fetchItemAudio, submitAttempt, onAllDone } = params;

  const [phase, setPhase] = useState<FlowPhase>('idle');
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micErrorReason, setMicErrorReason] = useState<MicErrorReason | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const promptAudioRef = useRef<HTMLAudioElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const countdownIntervalRef = useRef<number | null>(null);
  const mimeTypeRef = useRef('');
  const mountedRef = useRef(true);

  const cleanupTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      if (mountedRef.current) fn();
    }, ms);
    timersRef.current.push(id);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupTimers();
      if (promptAudioRef.current) {
        promptAudioRef.current.pause();
        promptAudioRef.current.src = '';
      }
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(
    (item: PublicSpeakingItem) => {
      const stream = streamRef.current;
      if (!stream) {
        setPhase('audio-error');
        return;
      }

      chunksRef.current = [];
      const mimeType = mimeTypeRef.current;
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      const windowSec = item.recordingWindowSec;
      setSecondsLeft(windowSec);
      setPhase('recording');

      recorder.onstop = () => {
        if (countdownIntervalRef.current !== null) {
          window.clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        const finalMime = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalMime });
        void uploadWithRetry(item, blob, finalMime);
      };

      recorder.start();

      const startedAt = Date.now();
      countdownIntervalRef.current = window.setInterval(() => {
        const elapsedSec = (Date.now() - startedAt) / 1000;
        setSecondsLeft(Math.max(0, Math.ceil(windowSec - elapsedSec)));
      }, 200);

      scheduleTimeout(() => {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          recorderRef.current.stop();
        }
      }, windowSec * 1000);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduleTimeout],
  );

  const beginItem = useCallback(
    (index: number) => {
      if (index >= items.length) {
        setPhase('all-done');
        onAllDone();
        return;
      }

      setCurrentIndex(index);
      setPhase('loading-audio');

      const item = items[index]!;

      void fetchItemAudio(item.id)
        .then(({ audioBase64 }) => {
          if (!mountedRef.current) return;

          const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
          promptAudioRef.current = audio;

          audio.onended = () => {
            if (!mountedRef.current) return;
            setPhase('pre-beep-pause');
            scheduleTimeout(() => {
              setPhase('beep');
              void playBeepTone(BEEP_DURATION_MS).then(() => {
                if (mountedRef.current) startRecording(item);
              });
            }, PAUSE_BEFORE_BEEP_MS);
          };

          audio.onerror = () => {
            if (mountedRef.current) setPhase('audio-error');
          };

          setPhase('playing-prompt');
          void audio.play().catch(() => {
            if (mountedRef.current) setPhase('audio-error');
          });
        })
        .catch(() => {
          if (mountedRef.current) setPhase('audio-error');
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, fetchItemAudio, scheduleTimeout, startRecording, onAllDone],
  );

  const uploadWithRetry = useCallback(
    async (item: PublicSpeakingItem, blob: Blob, mimeType: string) => {
      setPhase('submitting');

      for (let attempt = 0; attempt <= UPLOAD_MAX_RETRIES; attempt++) {
        try {
          await submitAttempt(item.id, blob, mimeType);
          if (!mountedRef.current) return;
          beginItem(currentIndex + 1);
          return;
        } catch {
          if (attempt < UPLOAD_MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, UPLOAD_RETRY_DELAY_MS));
          }
        }
      }

      if (mountedRef.current) setPhase('submit-failed');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIndex, beginItem, submitAttempt],
  );

  const start = useCallback(() => {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setPhase('unsupported');
      return;
    }

    setPhase('requesting-mic');
    setMicErrorReason(null);
    mimeTypeRef.current = pickSupportedMimeType();

    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then((stream) => {
        if (!mountedRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setMicStream(stream);
        beginItem(0);
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) return;
        setMicErrorReason(describeMicError(err));
        setPhase('mic-denied');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beginItem]);

  const retryAudioLoad = useCallback(() => {
    if (currentIndex < 0) return;
    beginItem(currentIndex);
  }, [currentIndex, beginItem]);

  const reset = useCallback(() => {
    cleanupTimers();
    if (promptAudioRef.current) {
      promptAudioRef.current.pause();
      promptAudioRef.current.src = '';
      promptAudioRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMicStream(null);
    setMicErrorReason(null);
    setPhase('idle');
    setCurrentIndex(-1);
    setSecondsLeft(0);
  }, [cleanupTimers]);

  return {
    phase,
    currentIndex,
    currentItem: currentIndex >= 0 ? items[currentIndex] ?? null : null,
    secondsLeft,
    micStream,
    micErrorReason,
    start,
    retryAudioLoad,
    reset,
  };
}