// backend/src/modules/azure-speech/azure-speech.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service'; 

const TTS_MAX_CHARS = 3000;
const STT_TIMEOUT_MS = 20_000;
const TTS_TIMEOUT_MS = 15_000;
const REDIS_TTS_TTL_SEC = 60 * 60 * 24 * 30; 

export interface TtsResult {
  audioBase64: string;
  cached: boolean;
}

export interface PronunciationScoreResult {
  recognizedText: string;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number | null;
  wordScores: Array<{ word: string; accuracyScore: number; errorType: string }>;
}

export interface AzureQuotaStatus {
  usedSeconds: number;
  limitSeconds: number;
  remainingSeconds: number;
}

const MONTHLY_STT_LIMIT_SECONDS = 5 * 60 * 60; 

@Injectable()
export class AzureSpeechService {
  private readonly logger = new Logger(AzureSpeechService.name);
  private readonly region: string;
  private readonly key: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    this.region = this.config.getOrThrow<string>('azureSpeech.region');
    this.key = this.config.getOrThrow<string>('azureSpeech.key');
  }

  async synthesize(text: string, voiceId: string, rate = 1.0): Promise<TtsResult> {
    const truncated = text.slice(0, TTS_MAX_CHARS);
    const contentHash = createHash('sha256').update(`${truncated}::${voiceId}::${rate}`).digest('hex');
    const redisKey = `tts:${contentHash}`;

    const cachedRedis = await this.redis.get(redisKey);
    if (cachedRedis !== null) {
      return { audioBase64: cachedRedis, cached: true };
    }

    const cachedMongo = await this.prisma.ttsCache.findUnique({
      where: { contentHash },
      select: { audioBase64: true },
    });

    if (cachedMongo !== null) {
      await this.redis.set(redisKey, cachedMongo.audioBase64, REDIS_TTS_TTL_SEC);
      void this.prisma.ttsCache
        .update({ where: { contentHash }, data: { hitCount: { increment: 1 } } })
        .catch(() => undefined);
      return { audioBase64: cachedMongo.audioBase64, cached: true };
    }

    const ssml = this.buildSsml(truncated, voiceId, rate);

    const response = await fetch(
      `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-64kbitrate-mono-mp3',
        },
        body: ssml,
        signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      this.logger.error('AZURE_TTS_ERROR', { status: response.status });
      throw new Error(`Azure TTS failed with status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(arrayBuffer).toString('base64');

    await Promise.all([
      this.redis.set(redisKey, audioBase64, REDIS_TTS_TTL_SEC),
      this.prisma.ttsCache.create({
        data: {
          contentHash,
          textLength: truncated.length,
          voiceId,
          modelId: 'azure-neural',
          audioBase64,
        },
      }),
    ]);

    this.logger.log('AZURE_TTS_SYNTHESIZED', { chars: truncated.length, voiceId });

    return { audioBase64, cached: false };
  }

  private buildSsml(text: string, voiceId: string, rate: number): string {
    const ratePercent = Math.round((rate - 1) * 100);
    const rateAttr = ratePercent === 0 ? 'default' : `${ratePercent > 0 ? '+' : ''}${ratePercent}%`;
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return `<speak version="1.0" xml:lang="en-US">
      <voice name="${voiceId}">
        <prosody rate="${rateAttr}">${escaped}</prosody>
      </voice>
    </speak>`;
  }

  // ── Pronunciation Assessment (для Listen and Repeat) ───────────────────────

  async assessPronunciation(wavBuffer: Buffer, referenceText: string): Promise<PronunciationScoreResult> {
    await this.enforceMonthlyQuota(wavBuffer.length);

    const pronunciationConfig = Buffer.from(
      JSON.stringify({
        ReferenceText: referenceText,
        GradingSystem: 'HundredMark',
        Granularity: 'Phoneme',
        EnableMiscue: true,
      }),
    ).toString('base64');

    const url = `https://${this.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.key,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        'Pronunciation-Assessment': pronunciationConfig,
        Accept: 'application/json',
      },
      body: new Uint8Array(wavBuffer),
      signal: AbortSignal.timeout(STT_TIMEOUT_MS),
    });

    if (!response.ok) {
      this.logger.error('AZURE_PRONUNCIATION_ERROR', { status: response.status });
      throw new Error(`Azure Pronunciation Assessment failed with status ${response.status}`);
    }

    const data = await response.json() as AzurePronunciationResponse;
    const best = data.NBest?.[0];

    if (best === undefined) {
      return {
        recognizedText: '',
        accuracyScore: 0,
        fluencyScore: 0,
        completenessScore: 0,
        prosodyScore: null,
        wordScores: [],
      };
    }

    await this.trackQuotaUsage(wavBuffer);

    return {
      recognizedText: data.DisplayText ?? '',
      accuracyScore: best.PronunciationAssessment?.AccuracyScore ?? 0,
      fluencyScore: best.PronunciationAssessment?.FluencyScore ?? 0,
      completenessScore: best.PronunciationAssessment?.CompletenessScore ?? 0,
      prosodyScore: best.PronunciationAssessment?.ProsodyScore ?? null,
      wordScores: (best.Words ?? []).map((w) => ({
        word: w.Word,
        accuracyScore: w.PronunciationAssessment?.AccuracyScore ?? 0,
        errorType: w.PronunciationAssessment?.ErrorType ?? 'None',
      })),
    };
  }

  async getQuotaStatus(): Promise<AzureQuotaStatus> {
    const usedSeconds = await this.getMonthlyUsageSeconds();
    return {
      usedSeconds,
      limitSeconds: MONTHLY_STT_LIMIT_SECONDS,
      remainingSeconds: Math.max(0, MONTHLY_STT_LIMIT_SECONDS - usedSeconds),
    };
  }

  private async enforceMonthlyQuota(audioByteLength: number): Promise<void> {
    const usedSeconds = await this.getMonthlyUsageSeconds();
    const estimatedSeconds = audioByteLength / 32000;

    if (usedSeconds + estimatedSeconds > MONTHLY_STT_LIMIT_SECONDS) {
      throw new AzureQuotaExceededError(usedSeconds, MONTHLY_STT_LIMIT_SECONDS);
    }
  }

  private async trackQuotaUsage(wavBuffer: Buffer): Promise<void> {
    const seconds = wavBuffer.length / 32000;
    const key = this.quotaRedisKey();
    await this.redis.incrbyfloat(key, seconds);

    const daysLeftInMonth = this.daysUntilMonthEnd();
    await this.redis.expire(key, daysLeftInMonth * 24 * 60 * 60);
  }

  private async getMonthlyUsageSeconds(): Promise<number> {
    const value = await this.redis.get(this.quotaRedisKey());
    return value !== null ? parseFloat(value) : 0;
  }

  private quotaRedisKey(): string {
    const now = new Date();
    return `azure:stt:seconds:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;
  }

  private daysUntilMonthEnd(): number {
    const now = new Date();
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }
}

export class AzureQuotaExceededError extends Error {
  constructor(
    public readonly usedSeconds: number,
    public readonly limitSeconds: number,
  ) {
    super('Azure Speech monthly quota exceeded');
  }
}

interface AzurePronunciationResponse {
  DisplayText?: string;
  NBest?: Array<{
    PronunciationAssessment?: {
      AccuracyScore: number;
      FluencyScore: number;
      CompletenessScore: number;
      ProsodyScore?: number;
    };
    Words?: Array<{
      Word: string;
      PronunciationAssessment?: {
        AccuracyScore: number;
        ErrorType: string;
      };
    }>;
  }>;
}