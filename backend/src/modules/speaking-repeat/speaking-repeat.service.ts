import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Level, Prisma, SpeakingDifficulty } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { MistakesService } from '../mistakes/mistakes.service';
import { AzureSpeechService, AzureQuotaExceededError } from '../azure-speech/azure-speech.service';
import { transcodeToWav16kMono } from './utils/transcode-audio';
import {
  computeItemScore,
  computeTaskScore,
  computeRepetitionAccuracy,
  MIN_ITEMS_PER_SET,
  MAX_ITEMS_PER_SET,
  RECORDING_WINDOW_BY_DIFFICULTY,
} from '../../constants/speaking-constants';
import { computeXP, isSessionCountable } from '../../constants/level-requirements';
import type {
  CreateSpeakingRepeatSetDto,
  GetSpeakingSetsDto,
} from './dto/speaking-repeat.dto';

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
  repetitionAccuracy: number;
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
    private readonly mistakes: MistakesService,
    private readonly azureSpeech: AzureSpeechService,
  ) {}

  async findAll(query: GetSpeakingSetsDto, userId: string) {
    const where: Prisma.SpeakingRepeatSetWhereInput = {};
    if (query.level !== undefined) where.level = query.level;
    if (query.scenario !== undefined) {
      where.scenario = { contains: query.scenario, mode: 'insensitive' };
    }

    const sets = await this.prisma.speakingRepeatSet.findMany({
      where,
      select: {
        id: true,
        scenario: true,
        level: true,
        voiceId: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (sets.length === 0) return sets;

    const sessions = await this.prisma.speakingRepeatSession.findMany({
      where: { userId, setId: { in: sets.map((s) => s.id) } },
      select: { setId: true, status: true, finalScore: true },
      orderBy: { startedAt: 'desc' },
    });

    const bestScoreMap = new Map<string, number>();
    const completedIds = new Set<string>();
    const inProgressIds = new Set<string>();

    for (const s of sessions) {
      if (s.status === 'COMPLETED') {
        completedIds.add(s.setId);
        bestScoreMap.set(s.setId, Math.max(bestScoreMap.get(s.setId) ?? 0, s.finalScore ?? 0));
      }
      if (s.status === 'IN_PROGRESS') inProgressIds.add(s.setId);
    }

    return sets.map((s) => ({
      id: s.id,
      scenario: s.scenario,
      level: s.level,
      itemCount: s._count.items,
      createdAt: s.createdAt,
      userStatus: inProgressIds.has(s.id)
        ? 'in_progress'
        : completedIds.has(s.id)
          ? 'completed'
          : 'not_started',
      bestScore: bestScoreMap.get(s.id) ?? null,
    }));
  }

  async getScenarios(level?: Level) {
    const rows = await this.prisma.speakingRepeatSet.findMany({
      where: level !== undefined ? { level } : undefined,
      select: { scenario: true },
      distinct: ['scenario'],
      orderBy: { scenario: 'asc' },
    });
    return rows.map((r) => r.scenario);
  }

  async findSetById(id: string) {
    const set = await this.prisma.speakingRepeatSet.findUnique({
      where: { id },
      include: { items: { orderBy: { orderIndex: 'asc' } } },
    });
    if (set === null) throw new NotFoundException('Speaking set not found');
    return set;
  }

  async startSession(userId: string, setId: string) {
    const set = await this.findSetById(setId);

    if (set.items.length < MIN_ITEMS_PER_SET || set.items.length > MAX_ITEMS_PER_SET) {
      throw new BadRequestException(
        `Speaking set must contain between ${MIN_ITEMS_PER_SET} and ${MAX_ITEMS_PER_SET} items`,
      );
    }

    await this.prisma.speakingRepeatSession.updateMany({
      where: { userId, setId, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' },
    });

    const session = await this.prisma.speakingRepeatSession.create({
      data: { userId, setId, results: [], playedItemIds: [] },
      select: { id: true, startedAt: true },
    });

    return { session, items: set.items, voiceId: set.voiceId };
  }

  async getItemAudio(userId: string, sessionId: string, setId: string, itemId: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    if (session.playedItemIds.includes(itemId)) {
      throw new ForbiddenException('This item can only be played once, as on the real TOEFL test.');
    }

    const set = await this.prisma.speakingRepeatSet.findUnique({
      where: { id: setId },
      select: { voiceId: true },
    });
    const item = await this.prisma.speakingRepeatItem.findUnique({ where: { id: itemId } });

    if (set === null || item === null) throw new NotFoundException('Item not found');
    if (item.setId !== setId) throw new BadRequestException('Item does not belong to this set');

    const synthesized = await this.azureSpeech.synthesize(item.text, set.voiceId);

    await this.prisma.speakingRepeatSession.update({
      where: { id: sessionId },
      data: { playedItemIds: { push: itemId } },
    });

    return {
      audioBase64: synthesized.audioBase64,
      referenceText: item.text,
      difficulty: item.difficulty,
      recordingWindowSec: item.recordingWindowSec,
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

    const item = await this.prisma.speakingRepeatItem.findUnique({ where: { id: itemId } });
    if (item === null) throw new NotFoundException('Item not found');
    if (item.setId !== session.setId) throw new BadRequestException('Item does not belong to this session');

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

    const repetitionAccuracy = computeRepetitionAccuracy(item.text, scores.recognizedText);
    const itemScore = computeItemScore({ ...scores, repetitionAccuracy });

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
      repetitionAccuracy,
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

    const setInfo = await this.prisma.speakingRepeatSet.findUnique({
      where: { id: session.setId },
      select: { scenario: true, level: true },
    });

    await this.mistakes.recordAttempt({
      userId,
      targetId: itemId,
      source: 'SPEAKING',
      category: 'PRONUNCIATION',
      topic: setInfo?.scenario ?? 'speaking',
      level: setInfo?.level ?? 'A1',
      isCorrect: itemScore >= 3.5,
      userAnswer: scores.recognizedText,
      correctAnswer: item.text,
      tags: scores.wordScores.filter((w) => w.accuracyScore < 60).map((w) => w.word),
    });

    return {
      itemScore,
      recognizedText: scores.recognizedText,
      accuracyScore: scores.accuracyScore,
      fluencyScore: scores.fluencyScore,
      completenessScore: scores.completenessScore,
      repetitionAccuracy,
      wordScores: scores.wordScores,
    };
  }

  async completeSession(userId: string, sessionId: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const results = session.results as unknown as SpeakingItemResultEntity[];
    const taskScore = computeTaskScore(results.map((r) => r.itemScore));
    const finalScore = Math.round((taskScore / 5) * 100);

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { streak: true } });
    const xpEarned = computeXP({ base: 40, streak: user?.streak ?? 0, accuracy: finalScore });

    const completed = await this.prisma.speakingRepeatSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED', completedAt: new Date(), taskScore, finalScore, xpEarned },
    });

    if (isSessionCountable(finalScore)) {
      await this.progress.recordSkillCompletion({ userId, skill: 'speaking', accuracy: finalScore, xpEarned });
    }

    return completed;
  }

  async getSessionReview(userId: string, sessionId: string) {
    const session = await this.prisma.speakingRepeatSession.findUnique({ where: { id: sessionId } });

    if (session === null) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('Access denied');

    return session;
  }

  async bulkCreate(sets: CreateSpeakingRepeatSetDto[]) {
    if (sets.length === 0) return { totalProcessed: 0, inserted: 0, skipped: 0 };

    const existing = await this.prisma.speakingRepeatSet.findMany({
      where: { OR: sets.map((s) => ({ level: s.level, scenario: s.scenario })) },
      select: { scenario: true, level: true },
    });

    const existingKeys = new Set(existing.map((e) => `${e.level}:${e.scenario}`));
    const toInsert = sets.filter((s) => !existingKeys.has(`${s.level}:${s.scenario}`));

    for (const set of toInsert) {
      await this.prisma.speakingRepeatSet.create({
        data: {
          scenario: set.scenario,
          level: set.level,
          voiceId: set.voiceId,
          items: {
            create: set.items.map((item) => ({
              text: item.text,
              difficulty: item.difficulty,
              orderIndex: item.orderIndex,
              imageUrl: item.imageUrl,
              recordingWindowSec:
                item.recordingWindowSec ?? RECORDING_WINDOW_BY_DIFFICULTY[item.difficulty as SpeakingDifficulty],
            })),
          },
        },
      });
    }

    return { totalProcessed: sets.length, inserted: toInsert.length, skipped: sets.length - toInsert.length };
  }

  private async getOwnedInProgressSession(userId: string, sessionId: string) {
    const session = await this.prisma.speakingRepeatSession.findUnique({ where: { id: sessionId } });

    if (session === null) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('Access denied');
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Session is already ${session.status.toLowerCase()}`);
    }

    return session;
  }
}
