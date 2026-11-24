import { spawn } from 'child_process';
import { BadRequestException, Logger } from '@nestjs/common';
import {
  RECORDING_GRACE_SEC,
  WAV_BYTES_PER_SECOND,
  WAV_HEADER_BYTES,
} from '../../../constants/speaking-constants';

const logger = new Logger('AudioTranscode');
const FFMPEG_TIMEOUT_MS = 15_000;


export function transcodeToWav16kMono(inputBuffer: Buffer, maxDurationSec?: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', 'pipe:0',
      ...(maxDurationSec !== undefined ? ['-t', String(maxDurationSec)] : []),
      '-ar', '16000',
      '-ac', '1',
      '-f', 'wav',
      '-acodec', 'pcm_s16le',
      'pipe:1',
    ];
    const ffmpeg = spawn('ffmpeg', args);

    const chunks: Buffer[] = [];
    const errorChunks: Buffer[] = [];
    let settled = false;

    const settle = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(killTimer);
      fn();
    };

    const killTimer = setTimeout(() => {
      logger.error('FFMPEG_TIMEOUT', { timeoutMs: FFMPEG_TIMEOUT_MS });
      ffmpeg.kill('SIGKILL');
      settle(() => reject(new Error('ffmpeg timed out')));
    }, FFMPEG_TIMEOUT_MS);

    ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.stderr.on('data', (chunk: Buffer) => errorChunks.push(chunk));

    ffmpeg.stdin.on('error', (err) => {
      logger.warn('FFMPEG_STDIN_WRITE_FAILED', { error: err.message });
    });

    ffmpeg.on('error', (err) => {
      logger.error('FFMPEG_SPAWN_FAILED', { error: err.message });
      settle(() => reject(new Error('ffmpeg is not available on this system')));
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        logger.error('FFMPEG_TRANSCODE_FAILED', {
          code,
          stderr: Buffer.concat(errorChunks).toString('utf-8').slice(0, 500),
        });
        settle(() => reject(new Error(`ffmpeg exited with code ${code}`)));
        return;
      }
      settle(() => resolve(Buffer.concat(chunks)));
    });

    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
}

export function wavDurationSec(wav: Buffer): number {
  return Math.max(0, (wav.length - WAV_HEADER_BYTES) / WAV_BYTES_PER_SECOND);
}

export interface PreparedAudio {
  wav: Buffer;
  durationSec: number;
}


export async function prepareSpeechAudio(raw: Buffer, windowSec: number): Promise<PreparedAudio> {
  try {
    const wav = await transcodeToWav16kMono(raw, windowSec + RECORDING_GRACE_SEC);
    return { wav, durationSec: wavDurationSec(wav) };
  } catch {
    throw new BadRequestException('Could not process the audio recording. Please try again.');
  }
}