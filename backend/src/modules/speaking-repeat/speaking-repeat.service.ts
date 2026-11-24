import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Level, Prisma, SpeakingDifficulty } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { MistakesService } from '../mistakes/mistakes.service';
import { AzureSpeechService, type PronunciationScoreResult } from '../azure-speech/azure-speech.service';
import { mapAzureError } from '../../common/utils/map-azure-error.util';
import { prepareSpeechAudio } from './utils/transcode-audio';
import {
  computeItemScore,
  computeTaskScore,
  computeRepetitionAccuracy,
  summarizeWordErrors,
  getListenRepeatTiming,
  isNonDecreasingDifficulty,
  MIN_ITEMS_PER_SET,
  MAX_ITEMS_PER_SET,
  EXAM_MODE_ITEM_COUNT,
  EXAM_MODE_MAX_POINTS,
  RECORDING_WINDOW_BY_DIFFICULTY,
  MAX_ITEM_SCORE,
  ITEM_PASS_SCORE,
  TOEFL_PICK_MASTERY_PERCENT,
  MIN_SPEECH_DURATION_SEC,
  LISTEN_REPEAT_PAUSE_BEFORE_BEEP_MS,
  LISTEN_REPEAT_BEEP_DURATION_MS,
} from '../../constants/speaking-constants';
import { computeXP, isSessionCountable, XP_BASE } from '../../constants/level-requirements';
import { EXAM_LEVEL_RANGE, isGuidedLevel, resolvePracticePolicy } from '../../constants/level-policy';
import { computeSpacedWeight, weightedPickOne } from '../../common/utils/spaced-selection.util';
import type { CreateSpeakingRepeatItemDto, CreateSpeakingRepeatSetDto, GetSpeakingSetsDto } from './dto/speaking-repeat.dto';

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

interface OrderedItem {
  id: string;
  text: string;
  difficulty: SpeakingDifficulty;
  recordingWindowSec: number;
}

export interface PublicSpeakingItem {
  id: string;
  difficulty: SpeakingDifficulty;
  orderIndex: number;
  recordingWindowSec: number;
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
        id: true, scenario: true, level: true, voiceId: true, imageUrl: true,
        isExamSet: true, createdAt: true, _count: { select: { items: true } },
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
      imageUrl: s.imageUrl,
      isExamSet: s.isExamSet,
      itemCount: s._count.items,
      createdAt: s.createdAt,
      userStatus: inProgressIds.has(s.id) ? 'in_progress' : completedIds.has(s.id) ? 'completed' : 'not_started',
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
    const set = await this.findSetWithItemsOrThrow(id);
    return {
      id: set.id,
      scenario: set.scenario,
      level: set.level,
      imageUrl: set.imageUrl,
      isExamSet: set.isExamSet,
      createdAt: set.createdAt,
      updatedAt: set.updatedAt,
      items: set.items.map((item) => this.toPublicItem(item)),
    };
  }

  async startSession(userId: string, setId: string) {
    const set = await this.findSetWithItemsOrThrow(setId);

    const minItems = set.isExamSet ? EXAM_MODE_ITEM_COUNT : MIN_ITEMS_PER_SET;
    const maxItems = set.isExamSet ? EXAM_MODE_ITEM_COUNT : MAX_ITEMS_PER_SET;

    if (set.items.length < minItems || set.items.length > maxItems) {
      throw new BadRequestException(
        set.isExamSet
          ? `Exam set is misconfigured: expected exactly ${EXAM_MODE_ITEM_COUNT} items, found ${set.items.length}`
          : `Speaking set must contain between ${MIN_ITEMS_PER_SET} and ${MAX_ITEMS_PER_SET} items`,
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

    return {
      session,
      scenario: set.scenario,
      voiceId: set.voiceId,
      imageUrl: set.imageUrl,
      isExamSet: set.isExamSet,
      maxPoints: set.isExamSet ? EXAM_MODE_MAX_POINTS : null,
      
      feedbackMode: this.hidesItemFeedback(set) ? 'end-only' : 'per-item',
      timing: {
        pauseBeforeBeepMs: LISTEN_REPEAT_PAUSE_BEFORE_BEEP_MS,
        beepDurationMs: LISTEN_REPEAT_BEEP_DURATION_MS,
      },
      items: set.items.map((item) => this.toPublicItem(item)),
    };
  }

  
  async startToeflModeSession(userId: string) {
    const sets = await this.prisma.speakingRepeatSet.findMany({
      where: { isExamSet: true, level: { in: [...EXAM_LEVEL_RANGE] } },
      select: { id: true },
    });
    if (sets.length === 0) {
      throw new BadRequestException('No TOEFL-format Listen and Repeat sets available yet.');
    }

    const sessions = await this.prisma.speakingRepeatSession.findMany({
      where: { userId, setId: { in: sets.map((s) => s.id) }, status: 'COMPLETED' },
      select: { setId: true, finalScore: true, completedAt: true },
      orderBy: { completedAt: 'desc' },
    });

    const lastBySet = new Map<string, { finalScore: number; completedAt: Date }>();
    for (const s of sessions) {
      if (!lastBySet.has(s.setId)) lastBySet.set(s.setId, { finalScore: s.finalScore ?? 0, completedAt: s.completedAt! });
    }

    const candidates = sets.map((s) => {
      const last = lastBySet.get(s.id);
      const weight = computeSpacedWeight({
        id: s.id,
        lastOutcome: last === undefined ? undefined : last.finalScore >= TOEFL_PICK_MASTERY_PERCENT ? 'correct' : 'incorrect',
        lastAttemptAt: last?.completedAt,
      });
      return { id: s.id, weight };
    });

    const picked = weightedPickOne(candidates);
    if (picked === null) throw new BadRequestException('No sets available right now — try again later.');

    return this.startSession(userId, picked.id);
  }

  async getItemAudio(userId: string, sessionId: string, itemId: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const [set, items] = await Promise.all([
      this.prisma.speakingRepeatSet.findUnique({ where: { id: session.setId }, select: { voiceId: true, level: true } }),
      this.getOrderedItems(session.setId),
    ]);
    if (set === null) throw new NotFoundException('Speaking set not found');

    const itemIndex = items.findIndex((i) => i.id === itemId);
    const item = items[itemIndex];
    if (item === undefined) throw new BadRequestException("Item does not belong to this session's set");

    
    if (itemIndex !== this.readResults(session.results).length) {
      throw new BadRequestException('Items must be played in order — as on the real test.');
    }
    if (session.playedItemIds.includes(itemId)) {
      throw new ForbiddenException('This item can only be played once, as on the real TOEFL test.');
    }

    
    
    const rate = resolvePracticePolicy(set.level, 1.0).rate;
    let audioBase64: string;
    try {
      audioBase64 = (await this.azureSpeech.synthesize(item.text, set.voiceId, rate)).audioBase64;
    } catch (err: unknown) {
      throw mapAzureError(err);
    }

    const claim = await this.prisma.speakingRepeatSession.updateMany({
      where: { id: sessionId, status: 'IN_PROGRESS', NOT: { playedItemIds: { has: itemId } } },
      data: { playedItemIds: { push: itemId } },
    });
    if (claim.count === 0) {
      throw new ForbiddenException('This item can only be played once, as on the real TOEFL test.');
    }

    const timing = getListenRepeatTiming(item.difficulty);
    return {
      audioBase64,
      difficulty: item.difficulty,
      recordingWindowSec: item.recordingWindowSec,
      pauseBeforeBeepMs: timing.pauseBeforeBeepMs,
      beepDurationMs: timing.beepDurationMs,
    };
  }

  async submitAttempt(userId: string, sessionId: string, itemId: string, rawAudioBuffer: Buffer, mimeType: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const [set, items] = await Promise.all([
      this.prisma.speakingRepeatSet.findUnique({
        where: { id: session.setId },
        select: { scenario: true, level: true, isExamSet: true },
      }),
      this.getOrderedItems(session.setId),
    ]);
    if (set === null) throw new NotFoundException('Speaking set not found');

    const itemIndex = items.findIndex((i) => i.id === itemId);
    const item = items[itemIndex];
    if (item === undefined) throw new BadRequestException('Item does not belong to this session');

    const results = this.readResults(session.results);
    if (itemIndex !== results.length) {
      throw new BadRequestException('Items must be answered in order, each exactly once — as on the real test.');
    }
    if (!session.playedItemIds.includes(itemId)) {
      throw new BadRequestException('Listen to the sentence before answering.');
    }

    const audio = await prepareSpeechAudio(rawAudioBuffer, item.recordingWindowSec);

    
    const entry = audio.durationSec < MIN_SPEECH_DURATION_SEC
      ? this.buildBlankResult(item, rawAudioBuffer.toString('base64'), mimeType)
      : await this.scoreAttempt(item, audio.wav, rawAudioBuffer, mimeType);

    const claim = await this.prisma.speakingRepeatSession.updateMany({
      where: { id: sessionId, status: 'IN_PROGRESS', NOT: { results: { some: { itemId } } } },
      data: { results: { push: entry } },
    });
    if (claim.count === 0) {
      throw new BadRequestException('This item was already answered and cannot be changed — as on the real test.');
    }

    if (entry.recognizedText !== '') {
      await this.mistakes.recordAttempt({
        userId,
        targetId: itemId,
        source: 'SPEAKING',
        category: 'PRONUNCIATION',
        topic: set.scenario,
        level: set.level,
        isCorrect: entry.itemScore >= ITEM_PASS_SCORE,
        userAnswer: entry.recognizedText,
        correctAnswer: item.text,
        tags: entry.wordScores.filter((w) => w.accuracyScore < 60).map((w) => w.word),
      });
    }

    const progress = { itemsAnswered: results.length + 1, totalItems: items.length };

    
    if (this.hidesItemFeedback(set)) return { recorded: true, ...progress };

    return {
      ...progress,
      itemScore: entry.itemScore,
      recognizedText: entry.recognizedText,
      accuracyScore: entry.accuracyScore,
      fluencyScore: entry.fluencyScore,
      completenessScore: entry.completenessScore,
      repetitionAccuracy: entry.repetitionAccuracy,
      wordScores: entry.wordScores,
    };
  }

  async completeSession(userId: string, sessionId: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const itemCount = await this.prisma.speakingRepeatItem.count({ where: { setId: session.setId } });
    const results = this.readResults(session.results);

    if (results.length < itemCount) {
      throw new BadRequestException(
        `All ${itemCount} items must be answered before completing this session (${results.length}/${itemCount} answered).`,
      );
    }

    return this.finalizeSession(userId, session.id, session.setId, results, false);
  }

  
  async expireSession(userId: string, sessionId: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const items = await this.getOrderedItems(session.setId);
    const results = this.readResults(session.results);
    const blanks = items.slice(results.length).map((item) => this.buildBlankResult(item, '', 'audio/webm'));

    return this.finalizeSession(userId, session.id, session.setId, [...results, ...blanks], blanks.length > 0);
  }

  async getSessionReview(userId: string, sessionId: string) {
    const session = await this.prisma.speakingRepeatSession.findUnique({ where: { id: sessionId } });

    if (session === null) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('Access denied');

    return session;
  }

  async bulkCreate(sets: CreateSpeakingRepeatSetDto[]) {
    if (sets.length === 0) return { totalProcessed: 0, inserted: 0, skipped: 0, errors: [] };

    const errors: Array<{ scenario: string; reason: string }> = [];
    const valid: Array<{ set: CreateSpeakingRepeatSetDto; items: CreateSpeakingRepeatItemDto[] }> = [];

    for (const set of sets) {
      const items = [...set.items].sort((a, b) => a.orderIndex - b.orderIndex);

      if (set.isExamSet === true) {
        if (items.length !== EXAM_MODE_ITEM_COUNT) {
          errors.push({ scenario: set.scenario, reason: `Exam set must contain exactly ${EXAM_MODE_ITEM_COUNT} items, got ${items.length}` });
          continue;
        }
        if (!isNonDecreasingDifficulty(items.map((i) => i.difficulty))) {
          errors.push({ scenario: set.scenario, reason: 'Exam set difficulty must not decrease (SHORT → MEDIUM → LONG), as on the real test' });
          continue;
        }
      }
      valid.push({ set, items });
    }

    const existing = valid.length === 0
      ? []
      : await this.prisma.speakingRepeatSet.findMany({
          where: { OR: valid.map(({ set }) => ({ level: set.level, scenario: set.scenario })) },
          select: { scenario: true, level: true },
        });

    const existingKeys = new Set(existing.map((e) => `${e.level}:${e.scenario}`));
    const toInsert = valid.filter(({ set }) => !existingKeys.has(`${set.level}:${set.scenario}`));

    for (const { set, items } of toInsert) {
      await this.prisma.speakingRepeatSet.create({
        data: {
          scenario: set.scenario,
          level: set.level,
          voiceId: set.voiceId,
          imageUrl: set.imageUrl,
          isExamSet: set.isExamSet ?? false,
          items: {
            create: items.map((item, idx) => ({
              text: item.text,
              difficulty: item.difficulty,
              orderIndex: idx, 
              recordingWindowSec:
                set.isExamSet === true
                  ? RECORDING_WINDOW_BY_DIFFICULTY[item.difficulty]
                  : item.recordingWindowSec ?? RECORDING_WINDOW_BY_DIFFICULTY[item.difficulty],
            })),
          },
        },
      });
    }

    return { totalProcessed: sets.length, inserted: toInsert.length, skipped: valid.length - toInsert.length, errors };
  }

  

  private hidesItemFeedback(set: { isExamSet: boolean; level: Level }): boolean {
    return set.isExamSet && !isGuidedLevel(set.level);
  }

  private readResults(raw: unknown): SpeakingItemResultEntity[] {
    return (raw as SpeakingItemResultEntity[] | null) ?? [];
  }

  private async scoreAttempt(
    item: OrderedItem,
    wav: Buffer,
    rawAudio: Buffer,
    mimeType: string,
  ): Promise<SpeakingItemResultEntity> {
    let scores: PronunciationScoreResult;
    try {
      scores = await this.azureSpeech.assessPronunciation(wav, item.text);
    } catch (err: unknown) {
      throw mapAzureError(err);
    }

    const repetitionAccuracy = computeRepetitionAccuracy(item.text, scores.recognizedText);
    const itemScore = computeItemScore({
      ...scores,
      repetitionAccuracy,
      wordErrors: summarizeWordErrors(scores.wordScores),
    });

    return {
      itemId: item.id,
      referenceText: item.text,
      recognizedText: scores.recognizedText,
      accuracyScore: scores.accuracyScore,
      fluencyScore: scores.fluencyScore,
      completenessScore: scores.completenessScore,
      prosodyScore: scores.prosodyScore,
      repetitionAccuracy,
      itemScore,
      wordScores: scores.wordScores,
      userAudioBase64: rawAudio.toString('base64'),
      userAudioMimeType: mimeType,
      attemptedAt: new Date().toISOString(),
    };
  }

  private buildBlankResult(item: OrderedItem, audioBase64: string, mimeType: string): SpeakingItemResultEntity {
    return {
      itemId: item.id,
      referenceText: item.text,
      recognizedText: '',
      accuracyScore: 0,
      fluencyScore: 0,
      completenessScore: 0,
      prosodyScore: null,
      repetitionAccuracy: 0,
      itemScore: 0,
      wordScores: [],
      userAudioBase64: audioBase64,
      userAudioMimeType: mimeType,
      attemptedAt: new Date().toISOString(),
    };
  }

  private async finalizeSession(
    userId: string,
    sessionId: string,
    setId: string,
    results: SpeakingItemResultEntity[],
    persistResults: boolean,
  ) {
    const taskScore = computeTaskScore(results.map((r) => r.itemScore));
    const finalScore = Math.round((taskScore / MAX_ITEM_SCORE) * 100);

    const [user, previousCompleted] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { streak: true } }),
      this.prisma.speakingRepeatSession.count({ where: { userId, setId, status: 'COMPLETED' } }),
    ]);
    const xpEarned = computeXP({ base: XP_BASE.SPEAKING_BASE, streak: user?.streak ?? 0, accuracy: finalScore });

    const claim = await this.prisma.speakingRepeatSession.updateMany({
      where: { id: sessionId, status: 'IN_PROGRESS' },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        taskScore,
        finalScore,
        xpEarned,
        ...(persistResults ? { results } : {}),
      },
    });
    if (claim.count === 0) throw new BadRequestException('Session was already completed');

    
    const isFirstCompletion = previousCompleted === 0;
    if (isFirstCompletion && isSessionCountable(finalScore)) {
      await this.progress.recordSkillCompletion({ userId, skill: 'speaking', accuracy: finalScore, xpEarned });
    } else {
      await this.progress.recordActivity({
        userId,
        xpEarned: isFirstCompletion ? xpEarned : Math.max(1, Math.round(xpEarned * 0.3)),
        minutesSpent: 3,
      });
    }

    const completed = await this.prisma.speakingRepeatSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: { id: true, status: true, taskScore: true, finalScore: true, xpEarned: true, startedAt: true, completedAt: true },
    });

    return {
      ...completed,
      rawPoints: results.reduce((sum, r) => sum + r.itemScore, 0),
      maxPoints: results.length * MAX_ITEM_SCORE,
    };
  }

  private async getOrderedItems(setId: string): Promise<OrderedItem[]> {
    return this.prisma.speakingRepeatItem.findMany({
      where: { setId },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, text: true, difficulty: true, recordingWindowSec: true },
    });
  }

  private async findSetWithItemsOrThrow(id: string) {
    const set = await this.prisma.speakingRepeatSet.findUnique({
      where: { id },
      include: { items: { orderBy: { orderIndex: 'asc' } } },
    });
    if (set === null) throw new NotFoundException('Speaking set not found');
    return set;
  }

  private toPublicItem(item: {
    id: string;
    difficulty: SpeakingDifficulty;
    orderIndex: number;
    recordingWindowSec: number;
  }): PublicSpeakingItem {
    return {
      id: item.id,
      difficulty: item.difficulty,
      orderIndex: item.orderIndex,
      recordingWindowSec: item.recordingWindowSec,
    };
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