


import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';



const GOOGLE_VOICE_ID = 'en-US-Neural2-F'; 
const GOOGLE_MODEL_ID = 'google-neural2';   

const VOICE_BY_LANG: Record<string, { name: string; ssmlGender: string }> = {
  'en-US': { name: 'en-US-Neural2-F', ssmlGender: 'FEMALE' },
  'en-GB': { name: 'en-GB-Neural2-A', ssmlGender: 'FEMALE' },
  'en-AU': { name: 'en-AU-Neural2-A', ssmlGender: 'FEMALE' },
};
const DEFAULT_VOICE = { name: 'en-US-Neural2-F', ssmlGender: 'FEMALE' };

const MAX_CHARS = 4_800; 
const TIMEOUT_MS = 15_000;

export interface TtsResult {
  audioBase64: string;
  fallback: false;
  cached: boolean;
}

export interface TtsFallbackResult {
  fallback: true;
  reason: string;
}

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async synthesize(
    materialId: string,
    text: string,
    rate?: number,
    lang?: string,
  ): Promise<TtsResult | TtsFallbackResult> {
    
    const material = await this.prisma.listeningMaterial.findUnique({
      where: { id: materialId },
      select: { id: true, speakerLang: true },
    });

    if (material === null) {
      throw new NotFoundException(`Listening material ${materialId} not found`);
    }

    
    const languageCode = lang ?? material.speakerLang ?? 'en-US';
    const speakingRate = Math.max(0.25, Math.min(rate ?? 1.0, 4.0));
    const voice = VOICE_BY_LANG[languageCode] ?? DEFAULT_VOICE;

    const apiKey = this.config.get<string>('googleTtsApiKey');
    if (!apiKey) {
      this.logger.warn('GOOGLE_TTS_API_KEY not configured — using browser TTS fallback');
      return { fallback: true, reason: 'api_key_not_configured' };
    }

    const truncatedText = text.slice(0, MAX_CHARS);

    
    
    const contentHash = createHash('sha256')
      .update(`${truncatedText}::${voice.name}::${GOOGLE_MODEL_ID}::${speakingRate.toFixed(2)}`)
      .digest('hex');

    
    const cached = await this.prisma.ttsCache.findUnique({
      where: { contentHash },
      select: { audioBase64: true },
    });

    if (cached !== null) {
      void this.prisma.ttsCache
        .update({
          where: { contentHash },
          data: { hitCount: { increment: 1 } },
        })
        .catch((err: unknown) => {
          this.logger.warn('TTS_CACHE_HIT_COUNT_UPDATE_FAILED', { error: String(err) });
        });

      this.logger.log('TTS_CACHE_HIT', {
        contentHash: contentHash.slice(0, 12),
        materialId,
      });

      return { audioBase64: cached.audioBase64, fallback: false, cached: true };
    }

    
    this.logger.log('TTS_GOOGLE_REQUEST', {
      materialId,
      textLength: truncatedText.length,
      voice: voice.name,
      speakingRate,
    });

    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: truncatedText },
            voice: {
              languageCode,
              name: voice.name,
              ssmlGender: voice.ssmlGender,
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate,
              pitch: 0,
              volumeGainDb: 1.5,              
              effectsProfileId: ['headphone-class-device'], 
            },
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );

      if (!response.ok) {
        const status = response.status;

        if (status === 429) {
          this.logger.warn('GOOGLE_TTS_RATE_LIMITED', { materialId });
          return { fallback: true, reason: 'rate_limited' };
        }
        if (status === 400) {
          const body = await response.text();
          this.logger.error('GOOGLE_TTS_BAD_REQUEST', { materialId, body });
          return { fallback: true, reason: 'bad_request' };
        }
        if (status === 403) {
          this.logger.error('GOOGLE_TTS_FORBIDDEN — проверь API ключ и включён ли Text-to-Speech API');
          return { fallback: true, reason: 'forbidden' };
        }

        this.logger.error('GOOGLE_TTS_API_ERROR', { status, materialId });
        return { fallback: true, reason: `http_${status}` };
      }

      const data = await response.json() as { audioContent?: string };

      if (!data.audioContent) {
        this.logger.error('GOOGLE_TTS_EMPTY_RESPONSE', { materialId });
        return { fallback: true, reason: 'empty_response' };
      }

      this.logger.log('TTS_GOOGLE_SUCCESS', {
        materialId,
        audioSizeKb: Math.round((data.audioContent.length * 3) / 4 / 1024),
      });

      
      void this.prisma.ttsCache
        .create({
          data: {
            contentHash,
            textLength: truncatedText.length,
            voiceId: voice.name,    
            modelId: GOOGLE_MODEL_ID,
            audioBase64: data.audioContent,
          },
        })
        .catch((err: unknown) => {
          this.logger.warn('TTS_CACHE_WRITE_FAILED', { error: String(err) });
        });

      return {
        audioBase64: data.audioContent,
        fallback: false,
        cached: false,
      };
    } catch (err: unknown) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      this.logger.error('TTS_GOOGLE_REQUEST_FAILED', {
        materialId,
        isTimeout,
        error: err instanceof Error ? err.message : String(err),
      });
      return { fallback: true, reason: isTimeout ? 'timeout' : 'network_error' };
    }
  }
}