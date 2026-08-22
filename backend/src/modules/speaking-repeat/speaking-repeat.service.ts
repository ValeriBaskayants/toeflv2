// backend/src/modules/speaking-repeat/speaking-repeat.service.ts
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { AzureSpeechService, AzureQuotaExceededError } from '../azure-speech/azure-speech.service';
import { transcodeToWav16kMono } from './utils/transcode-audio';
import { computeItemScore, computeTaskScore } from '../../constants/speaking-constants';
import { computeXP, isSessionCountable } from '../../constants/level-requirements';
import type { Level } from '@prisma/client';

interface SpeakingWordScoreEntity {
  word: string;
  accuracyScore: number;
  errorType: string;
}

interface SpeakingItemResultEntity {
  itemId: string;
  referenceText: string;
  recognizedText: string;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number | null;
  itemScore: number;
  wordScores: SpeakingWordScoreEntity[];
  userAudioBase64: string;
  userAudioMimeType: string;
  attemptedAt: string;
}

@Injectable()
export class SpeakingRepeatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly azureSpeech: AzureSpeechService,
  ) {}

  async findSetsForLevel(level: Level) {
    return this.prisma.speakingRepeatSet.findMany({
      where: { level },
      include: { items: { orderBy: { orderIndex: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async startSession(userId: string, setId: string) {
    const set = await this.prisma.speakingRepeatSet.findUnique({
      where: { id: setId },
      include: { items: { orderBy: { orderIndex: 'asc' } } },
    });

    if (set === null) {
      throw new NotFoundException('Speaking set not found');
    }

    if (set.items.length !== 7) {
      throw new BadRequestException('Speaking set must have exactly 7 items to match TOEFL format');
    }

    await this.prisma.speakingRepeatSession.updateMany({
      where: { userId, setId, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' },
    });

    const session = await this.prisma.speakingRepeatSession.create({
      data: { userId, setId, results: [] },
      select: { id: true, startedAt: true },
    });

    return { session, items: set.items, voiceId: set.voiceId };
  }

  async getItemAudio(setId: string, itemId: string) {
    const set = await this.prisma.speakingRepeatSet.findUnique({
      where: { id: setId },
      select: { voiceId: true },
    });

    const item = await this.prisma.speakingRepeatItem.findUnique({
      where: { id: itemId },
    });

    if (set === null || item === null) {
      throw new NotFoundException('Item not found');
    }

    const synthesized = await this.azureSpeech.synthesize(item.text, set.voiceId);

    return {
      audioBase64: synthesized.audioBase64,
      referenceText: item.text,
      difficulty: item.difficulty,
    };
  }

  async submitAttempt(
    userId: string,
    sessionId: string,
    itemId: string,
    rawAudioBuffer: Buffer,
    mimeType: string,
  ) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const item = await this.prisma.speakingRepeatItem.findUnique({
      where: { id: itemId },
    });

    if (item === null) {
      throw new NotFoundException('Item not found');
    }

    if (item.setId !== session.setId) {
      throw new BadRequestException('Item does not belong to this session');
    }

    let wavBuffer: Buffer;
    try {
      wavBuffer = await transcodeToWav16kMono(rawAudioBuffer);
    } catch {
      throw new BadRequestException('Could not process the audio recording. Please try again.');
    }

    let scores;
    try {
      scores = await this.azureSpeech.assessPronunciation(wavBuffer, item.text);
    } catch (err: unknown) {
      if (err instanceof AzureQuotaExceededError) {
        throw new ForbiddenException(
          'Monthly speech assessment quota reached. It resets on the 1st of next month.',
        );
      }
      throw err;
    }

    const itemScore = computeItemScore(scores);

    const existingResults = session.results as unknown as SpeakingItemResultEntity[];
    const filtered = existingResults.filter((r) => r.itemId !== itemId);

    const newResult: SpeakingItemResultEntity = {
      itemId,
      referenceText: item.text,
      recognizedText: scores.recognizedText,
      accuracyScore: scores.accuracyScore,
      fluencyScore: scores.fluencyScore,
      completenessScore: scores.completenessScore,
      prosodyScore: scores.prosodyScore,
      itemScore,
      wordScores: scores.wordScores,
      userAudioBase64: rawAudioBuffer.toString('base64'),
      userAudioMimeType: mimeType,
      attemptedAt: new Date().toISOString(),
    };

    await this.prisma.speakingRepeatSession.update({
      where: { id: sessionId },
      data: { results: [...filtered, newResult] },
    });

    return {
      itemScore,
      recognizedText: scores.recognizedText,
      accuracyScore: scores.accuracyScore,
      fluencyScore: scores.fluencyScore,
      completenessScore: scores.completenessScore,
      wordScores: scores.wordScores,
    };
  }

  async completeSession(userId: string, sessionId: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const results = session.results as unknown as SpeakingItemResultEntity[];
    const taskScore = computeTaskScore(results.map((r) => r.itemScore));
    const finalScore = Math.round((taskScore / 5) * 100);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { streak: true },
    });

    const xpEarned = computeXP({
      base: 40,
      streak: user?.streak ?? 0,
      accuracy: finalScore,
    });

    const completed = await this.prisma.speakingRepeatSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        taskScore,
        finalScore,
        xpEarned,
      },
    });

    if (isSessionCountable(finalScore)) {
      await this.progress.recordSkillCompletion({
        userId,
        skill: 'speaking',
        accuracy: finalScore,
        xpEarned,
      });
    }

    return completed;
  }

  async getSessionReview(userId: string, sessionId: string) {
    const session = await this.prisma.speakingRepeatSession.findUnique({
      where: { id: sessionId },
    });

    if (session === null) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return session;
  }

  private async getOwnedInProgressSession(userId: string, sessionId: string) {
    const session = await this.prisma.speakingRepeatSession.findUnique({
      where: { id: sessionId },
    });

    if (session === null) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Session is already ${session.status.toLowerCase()}`);
    }

    return session;
  }
}