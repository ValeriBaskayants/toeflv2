import {
  BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException,
} from '@nestjs/common';
import type { Level } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookmarksService } from '../bookmarks/bookmarks.service';
import { ReadingCompletionService, type ReadingItemOutcome } from '../reading-common/reading-completion.service';
import { buildCTest, blanksMatch, CTestError, hiddenSuffixOf, type CTestBuildResult } from '../../common/utils/c-test.util';
import { pickTaskForToeflMode, toPickableTasks, withTaskListMeta } from '../../common/utils/reading-task-picker.util';
import { taskFilterWhere } from '../../common/utils/task-filter.util';
import type { TaskFilterDto } from '../../common/dto/task-filter.dto';
import {
  COMPLETE_WORDS_BLANK_COUNT, COMPLETE_WORDS_WORD_RANGE, elapsedSec, isTimedOut, NO_ANSWER_LABEL,
  normalizeTypedAnswer, readingMistakeTargetId, toeflTimeLimitSec, type ReadingMode,
} from '../../constants/reading-toefl-constants';
import type { CreateCompleteWordsTaskDto } from './dto/complete-words.dto';

export interface CompleteWordAnswerEntity {
  blankIndex: number;
  typedText: string;
  isCorrect: boolean;
}

@Injectable()
export class ReadingCompleteWordsService {
  private readonly logger = new Logger(ReadingCompleteWordsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly completion: ReadingCompletionService,
    private readonly bookmarks: BookmarksService,
  ) {}

  async findAll(userId: string, query: TaskFilterDto) {
    const tasks = await this.prisma.readingCompleteWords.findMany({
      where: taskFilterWhere(query),
      select: { id: true, level: true, topic: true, grammarTopics: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const ids = tasks.map((t) => t.id);

    const [sessions, bookmarked] = await Promise.all([
      this.prisma.readingCompleteWordsSession.findMany({
        where: { userId, taskId: { in: ids }, status: 'COMPLETED' },
        select: { taskId: true, finalScore: true },
      }),
      this.bookmarks.getBookmarkedSet(userId, 'READING_COMPLETE_WORDS', ids),
    ]);

    return withTaskListMeta(tasks, sessions, bookmarked);
  }

  /**
   * Returns `segments` (text pieces + blank placeholders with visiblePrefix/hiddenLength).
   * The stored `fullText` holds the answers and is never sent to the client.
   */
  async startSession(userId: string, taskId: string, mode: ReadingMode = 'PRACTICE') {
    const task = await this.prisma.readingCompleteWords.findUnique({ where: { id: taskId }, select: { id: true, fullText: true } });
    if (task === null) {
      throw new NotFoundException('Task not found');
    }

    const built = this.buildOrFail(task.id, task.fullText);

    await this.prisma.readingCompleteWordsSession.updateMany({
      where: { userId, taskId, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' },
    });

    const timeLimitSec = mode === 'TOEFL' ? toeflTimeLimitSec(COMPLETE_WORDS_BLANK_COUNT) : null;
    const session = await this.prisma.readingCompleteWordsSession.create({
      data: { userId, taskId, answers: [], mode, timeLimitSec },
      select: { id: true, startedAt: true },
    });

    return {
      sessionId: session.id,
      startedAt: session.startedAt,
      mode,
      timeLimitSec,
      blankCount: built.blanks.length,
      segments: built.segments,
    };
  }

  async startToeflModeSession(userId: string, targetLevel?: Level) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { currentLevel: true } });
    if (user === null) {
      throw new NotFoundException('User not found');
    }
    const level = targetLevel ?? user.currentLevel;

    const tasks = await this.prisma.readingCompleteWords.findMany({ where: { level }, select: { id: true } });
    if (tasks.length === 0) {
      throw new BadRequestException(`No Complete the Words tasks available for level ${level} yet.`);
    }

    const taskIds = tasks.map((t) => t.id);
    const sessions = await this.prisma.readingCompleteWordsSession.findMany({
      where: { userId, taskId: { in: taskIds }, status: 'COMPLETED' },
      select: { taskId: true, finalScore: true, completedAt: true },
      orderBy: { completedAt: 'desc' },
    });

    const pickedId = pickTaskForToeflMode(toPickableTasks(taskIds, sessions));
    if (pickedId === null) {
      throw new BadRequestException('No tasks available right now.');
    }
    return this.startSession(userId, pickedId, 'TOEFL');
  }

  async submitAnswers(userId: string, sessionId: string, answers: Array<{ blankIndex: number; typedText: string }>, timezone?: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);
    const task = await this.prisma.readingCompleteWords.findUnique({
      where: { id: session.taskId },
      select: { id: true, level: true, topic: true, grammarTopics: true, fullText: true },
    });
    if (task === null) {
      throw new NotFoundException('Task no longer exists');
    }

    const { blanks } = this.buildOrFail(task.id, task.fullText);
    const answerMap = new Map(answers.map((a) => [a.blankIndex, a.typedText]));

    const graded: CompleteWordAnswerEntity[] = [];
    const items: ReadingItemOutcome[] = [];

    for (const blank of blanks) {
      const typedText = answerMap.get(blank.index) ?? '';
      const typed = normalizeTypedAnswer(typedText);
      // Accept the missing letters, and the whole word in case the UI echoes the visible prefix.
      const isCorrect =
        typed.length > 0 &&
        (typed === normalizeTypedAnswer(hiddenSuffixOf(blank)) || typed === normalizeTypedAnswer(blank.fullWord));

      graded.push({ blankIndex: blank.index, typedText, isCorrect });
      items.push({
        mistakeTargetId: readingMistakeTargetId('COMPLETE_WORDS', task.id, blank.index),
        isCorrect,
        userAnswer: typedText.length > 0 ? blank.visiblePrefix + typedText : NO_ANSWER_LABEL,
        correctAnswer: blank.fullWord,
        category: 'SPELLING',
      });
    }

    const correctCount = graded.filter((g) => g.isCorrect).length;
    const totalCount = blanks.length;
    const accuracy = Math.round((correctCount / totalCount) * 100);
    const timeSpentSec = elapsedSec(session.startedAt);
    const timedOut = isTimedOut(session.mode, session.timeLimitSec, timeSpentSec);

    const priorCompleted = await this.prisma.readingCompleteWordsSession.count({
      where: { userId, taskId: task.id, status: 'COMPLETED' },
    });
    const isFirstAttempt = priorCompleted === 0;

    // Atomic claim: a double submit (double click, two tabs) cannot complete the session twice.
    const claim = await this.prisma.readingCompleteWordsSession.updateMany({
      where: { id: sessionId, status: 'IN_PROGRESS' },
      data: {
        status: 'COMPLETED', completedAt: new Date(), answers: graded,
        correctCount, totalCount, finalScore: accuracy, timeSpentSec, timedOut,
      },
    });
    if (claim.count === 0) {
      throw new BadRequestException('Session was already completed');
    }

    const outcome = await this.completion.complete({
      userId, kind: 'COMPLETE_WORDS', level: task.level, topic: task.topic, grammarTopics: task.grammarTopics,
      accuracy, isFirstAttempt, timeSpentSec, timezone, items,
    });
    await this.prisma.readingCompleteWordsSession.update({ where: { id: sessionId }, data: { xpEarned: outcome.xpEarned } });

    return {
      correctCount, totalCount, accuracy, timeSpentSec, timedOut, mode: session.mode ?? 'PRACTICE',
      xpEarned: outcome.xpEarned,
      countedAsCompleted: outcome.countedAsCompleted,
      isLevelMatched: outcome.isLevelMatched,
      isFirstAttempt,
      progressRecorded: outcome.sideEffectsOk,
      revealedWords: blanks.map((b) => ({ index: b.index, fullWord: b.fullWord })),
      answers: graded,
    };
  }

  async bulkCreate(items: CreateCompleteWordsTaskDto[]) {
    const prepared = items.map((item, i) => {
      let built: CTestBuildResult;
      try {
        built = buildCTest(item.fullText, COMPLETE_WORDS_BLANK_COUNT);
      } catch (err: unknown) {
        if (err instanceof CTestError) {
          throw new BadRequestException(`items[${i}]: ${err.message}`);
        }
        throw err;
      }

      if (built.wordCount < COMPLETE_WORDS_WORD_RANGE.min || built.wordCount > COMPLETE_WORDS_WORD_RANGE.max) {
        throw new BadRequestException(
          `items[${i}]: text has ${built.wordCount} words, expected ${COMPLETE_WORDS_WORD_RANGE.min}-${COMPLETE_WORDS_WORD_RANGE.max} (ETS: about 70-100)`,
        );
      }
      if (item.blanks !== undefined && !blanksMatch(built.blanks, item.blanks)) {
        const expected = built.blanks.map((b) => `${b.index}:${b.fullWord}/${b.visiblePrefix}`).join(', ');
        throw new BadRequestException(`items[${i}]: blanks do not follow the official rule. Expected: ${expected}`);
      }

      return {
        level: item.level,
        topic: item.topic ?? '',
        grammarTopics: item.grammarTopics ?? [],
        fullText: item.fullText.trim(),
        blanks: built.blanks,
      };
    });

    // Re-importing a file used to create duplicates; dedupe by text, in the DB and inside the batch.
    const existing = await this.prisma.readingCompleteWords.findMany({
      where: { fullText: { in: prepared.map((p) => p.fullText) } },
      select: { fullText: true },
    });
    const seen = new Set(existing.map((e) => e.fullText));
    const toInsert = prepared.filter((p) => {
      if (seen.has(p.fullText)) {
        return false;
      }
      seen.add(p.fullText);
      return true;
    });

    if (toInsert.length > 0) {
      await this.prisma.readingCompleteWords.createMany({ data: toInsert });
    }
    return { totalProcessed: items.length, inserted: toInsert.length, skipped: items.length - toInsert.length };
  }

  private buildOrFail(taskId: string, fullText: string): CTestBuildResult {
    try {
      return buildCTest(fullText, COMPLETE_WORDS_BLANK_COUNT);
    } catch (err: unknown) {
      if (err instanceof CTestError) {
        this.logger.error({ event: 'CTEST_TASK_MALFORMED', taskId, reason: err.message });
        throw new InternalServerErrorException('Task content is malformed');
      }
      throw err;
    }
  }

  private async getOwnedInProgressSession(userId: string, sessionId: string) {
    const session = await this.prisma.readingCompleteWordsSession.findUnique({ where: { id: sessionId } });
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