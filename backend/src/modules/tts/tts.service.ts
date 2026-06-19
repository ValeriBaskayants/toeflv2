import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';






const ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; 



const ELEVENLABS_MODEL_ID = 'eleven_multilingual_v2';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1'


const REQUEST_TIMEOUT_MS = 15_000;



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
  ): Promise<TtsResult | TtsFallbackResult> {
    
    
    
    const material = await this.prisma.listeningMaterial.findUnique({
      where: { id: materialId },
      select: { id: true, speakerRate: true },
    });

    if (material === null) {
      throw new NotFoundException(`Listening material ${materialId} not found`);
    }

    
    const apiKey = this.config.get<string>('elevenlabs.apiKey');

    if (!apiKey) {
      
      this.logger.warn('ELEVENLABS_KEY_NOT_CONFIGURED — using browser TTS fallback');
      return { fallback: true, reason: 'api_key_not_configured' };
    }

    
    
    
    const contentHash = createHash('sha256')
      .update(`${text}::${ELEVENLABS_VOICE_ID}::${ELEVENLABS_MODEL_ID}`)
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

      this.logger.log('TTS_CACHE_HIT', { contentHash: contentHash.slice(0, 12), materialId });

      return {
        audioBase64: cached.audioBase64,
        fallback: false,
        cached: true,
      };
    }

    
    this.logger.log('TTS_ELEVENLABS_REQUEST', {
      materialId,
      textLength: text.length,
      voiceId: ELEVENLABS_VOICE_ID,
    });

    try {
      const response = await fetch(
        `${ELEVENLABS_BASE_URL}/text-to-speech/${ELEVENLABS_VOICE_ID}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: ELEVENLABS_MODEL_ID,
            voice_settings: {
              
              
              stability: 0.5,
              
              
              similarity_boost: 0.75,
              
              
              style: 0.0,
              
              use_speaker_boost: true,
            },
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );

      
      if (!response.ok) {
        const status = response.status;

        if (status === 429) {
          
          this.logger.warn('ELEVENLABS_RATE_LIMITED', { materialId });
          return { fallback: true, reason: 'rate_limited' };
        }

        if (status === 401) {
          
          this.logger.error('ELEVENLABS_UNAUTHORIZED — check ELEVENLABS_API_KEY env var');
          return { fallback: true, reason: 'unauthorized' };
        }

        
        this.logger.error('ELEVENLABS_API_ERROR', { status, materialId });
        return { fallback: true, reason: `http_${status}` };
      }

      
      const arrayBuffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(arrayBuffer).toString('base64');

      this.logger.log('ELEVENLABS_SUCCESS', {
        materialId,
        audioSizeKb: Math.round(arrayBuffer.byteLength / 1024),
      });

      
      
      await this.prisma.ttsCache
        .create({
          data: {
            contentHash,
            textLength: text.length,
            voiceId: ELEVENLABS_VOICE_ID,
            modelId: ELEVENLABS_MODEL_ID,
            audioBase64,
          },
        })
        .catch((err: unknown) => {
          
          this.logger.warn('TTS_CACHE_WRITE_FAILED', { error: String(err) });
        });

      return {
        audioBase64,
        fallback: false,
        cached: false,
      };
    } catch (err: unknown) {
      
      const isTimeout = err instanceof Error && err.name === 'AbortError';

      this.logger.error('ELEVENLABS_REQUEST_FAILED', {
        materialId,
        isTimeout,
        error: err instanceof Error ? err.message : String(err),
      });

      
      return { fallback: true, reason: isTimeout ? 'timeout' : 'network_error' };
    }
  }
}