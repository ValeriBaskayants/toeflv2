import { spawn } from 'child_process';
import { Logger } from '@nestjs/common';

const logger = new Logger('AudioTranscode');

export function transcodeToWav16kMono(inputBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', 'pipe:0',
      '-ar', '16000',
      '-ac', '1',
      '-f', 'wav',
      '-acodec', 'pcm_s16le',
      'pipe:1',
    ]);

    const chunks: Buffer[] = [];
    const errorChunks: Buffer[] = [];

    ffmpeg.stdout.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    ffmpeg.stderr.on('data', (chunk: Buffer) => {
      errorChunks.push(chunk);
    });

    ffmpeg.on('error', (err) => {
      logger.error('FFMPEG_SPAWN_FAILED', { error: err.message });
      reject(new Error('ffmpeg is not available on this system'));
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        logger.error('FFMPEG_TRANSCODE_FAILED', {
          code,
          stderr: Buffer.concat(errorChunks).toString('utf-8').slice(0, 500),
        });
        reject(new Error(`ffmpeg exited with code ${code}`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });

    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
}