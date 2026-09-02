import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AzureSpeechService, AzureTtsRequestError } from '../azure-speech/azure-speech.service';

const VOICE_BY_LANG: Readonly<Record<string, string>> = {
  'en-US': 'en-US-AriaNeural',
  'en-GB': 'en-GB-SoniaNeural',
  'en-AU': 'en-AU-NatashaNeural',
};
const DEFAULT_VOICE = 'en-US-AriaNeural';

const SYNTHESIS_RATE = 1.0;

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
    private readonly azureSpeech: AzureSpeechService,
  ) {}

  private resolveVoice(lang: string): string {
    return VOICE_BY_LANG[lang] ?? DEFAULT_VOICE;
  }

  async synthesize(
    materialId: string,
    text: string,
    _rate: number | undefined,
    lang: string | undefined,
  ): Promise<TtsResult | TtsFallbackResult> {
    const material = await this.prisma.listeningMaterial.findUnique({
      where: { id: materialId },
      select: { id: true, speakerLang: true },
    });

    if (material === null) {
      throw new NotFoundException(`Listening material ${materialId} not found`);
    }

    const resolvedLang = lang ?? material.speakerLang;
    const voiceId = this.resolveVoice(resolvedLang);

    try {
      const result = await this.azureSpeech.synthesize(text, voiceId, SYNTHESIS_RATE);

      this.logger.log(result.cached ? 'TTS_CACHE_HIT' : 'TTS_AZURE_SUCCESS', {
        materialId,
        voiceId,
      });

      return { audioBase64: result.audioBase64, fallback: false, cached: result.cached };
    } catch (err: unknown) {
      return this.mapFailureToFallback(err, materialId);
    }
  }

  private mapFailureToFallback(err: unknown, materialId: string): TtsFallbackResult {
    if (err instanceof AzureTtsRequestError) {
      if (err.status === 429) {
        this.logger.warn('AZURE_TTS_RATE_LIMITED', { materialId });
        return { fallback: true, reason: 'rate_limited' };
      }
      if (err.status === 401 || err.status === 403) {
        this.logger.error(
          'AZURE_TTS_UNAUTHORIZED — проверь AZURE_SPEECH_KEY / AZURE_SPEECH_REGION в .env',
        );
        return { fallback: true, reason: 'unauthorized' };
      }
      this.logger.error('AZURE_TTS_API_ERROR', { status: err.status, materialId });
      return { fallback: true, reason: `http_${err.status}` };
    }

    const isTimeout = err instanceof Error && err.name === 'AbortError';
    this.logger.error('AZURE_TTS_REQUEST_FAILED', {
      materialId,
      isTimeout,
      error: err instanceof Error ? err.message : String(err),
    });
    return { fallback: true, reason: isTimeout ? 'timeout' : 'network_error' };
  }
}