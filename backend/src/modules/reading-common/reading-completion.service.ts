import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ErrorCategory, Level } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { MistakesService } from '../mistakes/mistakes.service';
import { TopicMasteryService } from '../topic-mastery/topic-mastery.service';
import { computeXP, isSessionCountable, REREAD_XP_MULTIPLIER } from '../../constants/level-requirements';
import {
  MAX_ACTIVITY_MINUTES_PER_TASK, READING_KIND_LABEL, readingBaseXp, UNCOUNTED_ATTEMPT_XP_FACTOR,
  type ReadingTaskKind,
} from '../../constants/reading-toefl-constants';

export interface ReadingItemOutcome {
  /** Build with readingMistakeTargetId(). */
  mistakeTargetId: string;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  category: ErrorCategory;
  tags?: string[];
}

export interface CompleteReadingTaskParams {
  userId: string;
  kind: ReadingTaskKind;
  level: Level;
  topic: string;
  grammarTopics: string[];
  accuracy: number;
  isFirstAttempt: boolean;
  timeSpentSec: number;
  timezone?: string;
  items: ReadingItemOutcome[];
}

export interface CompleteReadingTaskResult {
  /** XP that was ACTUALLY written to the user. */
  xpEarned: number;
  countedAsCompleted: boolean;
  isLevelMatched: boolean;
  sideEffectsOk: boolean;
}

@Injectable()
export class ReadingCompletionService {
  private readonly logger = new Logger(ReadingCompletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly mistakes: MistakesService,
    private readonly topicMastery: TopicMasteryService,
  ) {}

  async complete(params: CompleteReadingTaskParams): Promise<CompleteReadingTaskResult> {
    const user = await this.prisma.user.findUnique({ where: { id: params.userId }, select: { currentLevel: true } });
    if (user === null) {
      throw new NotFoundException('User not found');
    }

    const isLevelMatched = user.currentLevel === params.level;
    const sessionCountable = isSessionCountable(params.accuracy);
    const countedAsCompleted = params.isFirstAttempt && isLevelMatched && sessionCountable;
    const minutesSpent = Math.min(MAX_ACTIVITY_MINUTES_PER_TASK, Math.max(1, Math.round(params.timeSpentSec / 60)));

    let xpEarned = 0;
    let sideEffectsOk = true;

    
    
    try {
      const streak = await this.progress.getEffectiveStreak(params.userId, params.timezone);
      const baseXp = readingBaseXp(params.items.length);
      const fullXp = computeXP({
        base: params.isFirstAttempt ? baseXp : Math.round(baseXp * REREAD_XP_MULTIPLIER),
        streak,
        accuracy: params.accuracy,
      });

      if (countedAsCompleted) {
        const result = await this.progress.recordSkillCompletion({
          userId: params.userId, skill: 'reading', accuracy: params.accuracy,
          xpEarned: fullXp, minutesSpent, timezone: params.timezone,
        });
        xpEarned = result.xpEarned;
      } else {
        xpEarned = Math.max(1, Math.round(fullXp * UNCOUNTED_ATTEMPT_XP_FACTOR));
        await this.progress.recordActivity({ userId: params.userId, xpEarned, minutesSpent, timezone: params.timezone });
      }
    } catch (err: unknown) {
      sideEffectsOk = false;
      xpEarned = 0;
      this.logger.error({ event: 'READING_PROGRESS_FAILED', userId: params.userId, kind: params.kind }, err instanceof Error ? err.stack : undefined);
    }

    
    if (params.grammarTopics.length > 0 && params.isFirstAttempt && sessionCountable) {
      try {
        await this.topicMastery.recordPractice({ userId: params.userId, topicSlugs: params.grammarTopics, kind: 'reading' });
      } catch (err: unknown) {
        sideEffectsOk = false;
        this.logger.error({ event: 'READING_TOPIC_MASTERY_FAILED', userId: params.userId, kind: params.kind }, err instanceof Error ? err.stack : undefined);
      }
    }

    
    
    
    try {
      const topic = params.topic.trim().length > 0 ? params.topic : READING_KIND_LABEL[params.kind];
      await Promise.all(
        params.items.map((item) =>
          this.mistakes.recordAttempt({
            userId: params.userId, targetId: item.mistakeTargetId, source: 'READING', category: item.category,
            topic, level: params.level, isCorrect: item.isCorrect,
            userAnswer: item.userAnswer, correctAnswer: item.correctAnswer,
            tags: [...params.grammarTopics, ...(item.tags ?? [])],
          }),
        ),
      );
    } catch (err: unknown) {
      sideEffectsOk = false;
      this.logger.error({ event: 'READING_MISTAKES_FAILED', userId: params.userId, kind: params.kind }, err instanceof Error ? err.stack : undefined);
    }

    return { xpEarned, countedAsCompleted, isLevelMatched, sideEffectsOk };
  }
}