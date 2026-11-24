import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Level } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { MistakesService } from '../mistakes/mistakes.service';
import { TopicMasteryService } from '../topic-mastery/topic-mastery.service';
import { isSessionCountable } from '../../constants/level-requirements';
import { buildMistakeTargetId } from '../../constants/mistake-targets';
import { MAX_ACTIVITY_MINUTES_PER_SCRAMBLE, UNCOUNTED_SCRAMBLE_XP_FACTOR } from '../../constants/scramble-constants';

export interface ScrambleItemOutcome {
  exerciseId: string;
  level: Level;
  topic: string;
  topicSlugs: string[];
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  tags: string[];
  /** The user had never completed this exercise before (as a single session or inside a block). */
  isFirstCompletion: boolean;
}

export interface CompleteScrambleParams {
  userId: string;
  items: ScrambleItemOutcome[];
  /** 0-100 over the whole completion (one exercise = 0 or 100). */
  accuracyPercent: number;
  /** XP before the "does not count" factor. */
  baseXp: number;
  timeSpentSec: number;
  timezone?: string;
  /** false when the items were already recorded one by one (guided blocks). */
  recordItems: boolean;
}

export interface CompleteScrambleResult {
  /** XP that was ACTUALLY written to the user. */
  xpEarned: number;
  /** How many exercises counted toward the level (first completion + correct + the user's own level). */
  countedUnits: number;
  sideEffectsOk: boolean;
}

@Injectable()
export class ScrambleCompletionService {
  private readonly logger = new Logger(ScrambleCompletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly mistakes: MistakesService,
    private readonly topicMastery: TopicMasteryService,
  ) {}

  async complete(p: CompleteScrambleParams): Promise<CompleteScrambleResult> {
    const user = await this.prisma.user.findUnique({ where: { id: p.userId }, select: { currentLevel: true } });
    if (user === null) {
      throw new NotFoundException('User not found');
    }

    // Farming guard (same rule as Reading): replays and other-level exercises never move the level counter.
    const countedUnits = p.items.filter((i) => i.isCorrect && i.isFirstCompletion && i.level === user.currentLevel).length;
    const minutesSpent = Math.min(MAX_ACTIVITY_MINUTES_PER_SCRAMBLE, Math.max(1, Math.round(p.timeSpentSec / 60)));

    let xpEarned = 0;
    let sideEffectsOk = true;

    // The session/block is already claimed as COMPLETED by the caller: a failure here must not become a 500 the user cannot retry.
    try {
      if (countedUnits > 0 && isSessionCountable(p.accuracyPercent)) {
        const result = await this.progress.recordSkillCompletion({
          userId: p.userId, skill: 'scramble', accuracy: p.accuracyPercent, xpEarned: p.baseXp,
          units: countedUnits, minutesSpent, timezone: p.timezone,
        });
        xpEarned = result.xpEarned;
      } else {
        xpEarned = Math.max(1, Math.round(p.baseXp * UNCOUNTED_SCRAMBLE_XP_FACTOR));
        await this.progress.recordActivity({ userId: p.userId, xpEarned, minutesSpent, timezone: p.timezone });
      }
    } catch (err: unknown) {
      sideEffectsOk = false;
      xpEarned = 0;
      this.logger.error({ event: 'SCRAMBLE_PROGRESS_FAILED', userId: p.userId }, err instanceof Error ? err.stack : undefined);
    }

    if (p.recordItems) {
      sideEffectsOk = (await this.recordItems(p.userId, p.items)) && sideEffectsOk;
    }
    return { xpEarned, countedUnits, sideEffectsOk };
  }

  /** Mistakes for EVERY item (a correct answer on a previously wrong item moves it through the ladder) + topic mastery for first correct completions. */
  async recordItems(userId: string, items: ScrambleItemOutcome[]): Promise<boolean> {
    let ok = true;

    for (const item of items) {
      try {
        await this.mistakes.recordAttempt({
          userId,
          targetId: buildMistakeTargetId('BUILD_SENTENCE', item.exerciseId, 'item'),
          source: 'SCRAMBLE',
          category: 'GRAMMAR',
          topic: item.topic,
          level: item.level,
          isCorrect: item.isCorrect,
          userAnswer: item.userAnswer,
          correctAnswer: item.correctAnswer,
          tags: item.tags,
        });
      } catch (err: unknown) {
        ok = false;
        this.logger.error({ event: 'SCRAMBLE_MISTAKE_FAILED', userId, exerciseId: item.exerciseId }, err instanceof Error ? err.stack : undefined);
      }

      if (item.isCorrect && item.isFirstCompletion && item.topicSlugs.length > 0) {
        try {
          await this.topicMastery.recordPractice({ userId, topicSlugs: item.topicSlugs, kind: 'scramble', accuracy: 100 });
        } catch (err: unknown) {
          ok = false;
          this.logger.error({ event: 'SCRAMBLE_TOPIC_MASTERY_FAILED', userId, exerciseId: item.exerciseId }, err instanceof Error ? err.stack : undefined);
        }
      }
    }
    return ok;
  }
}