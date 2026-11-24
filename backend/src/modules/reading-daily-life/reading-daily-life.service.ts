import { randomUUID } from 'crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Level } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookmarksService } from '../bookmarks/bookmarks.service';
import { ReadingCompletionService, type ReadingItemOutcome } from '../reading-common/reading-completion.service';
import { pickTaskForToeflMode, toPickableTasks, withTaskListMeta } from '../../common/utils/reading-task-picker.util';
import { validateDailyLife } from '../../common/utils/reading-content.util';
import { taskFilterWhere } from '../../common/utils/task-filter.util';
import {
  elapsedSec, isTimedOut, NO_ANSWER_LABEL, readingMistakeTargetId, toeflTimeLimitSec, type ReadingMode,
} from '../../constants/reading-toefl-constants';
import type { CreateDailyLifeTaskDto, GetDailyLifeDto } from './dto/daily-life.dto';

interface SimpleQuestionEntity {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
  skill?: string | null;
}

interface SimpleAnswerEntity {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
}

@Injectable()
export class ReadingDailyLifeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly completion: ReadingCompletionService,
    private readonly bookmarks: BookmarksService,
  ) {}

  async findAll(userId: string, query: GetDailyLifeDto) {
    const tasks = await this.prisma.readingDailyLifeTask.findMany({
      where: { ...taskFilterWhere(query), ...(query.format !== undefined ? { format: query.format } : {}) },
      select: { id: true, level: true, topic: true, format: true, grammarTopics: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const ids = tasks.map((t) => t.id);

    const [sessions, bookmarked] = await Promise.all([
      this.prisma.readingDailyLifeSession.findMany({
        where: { userId, taskId: { in: ids }, status: 'COMPLETED' },
        select: { taskId: true, finalScore: true },
      }),
      this.bookmarks.getBookmarkedSet(userId, 'READING_DAILY_LIFE', ids),
    ]);

    return withTaskListMeta(tasks, sessions, bookmarked);
  }

  async startSession(userId: string, taskId: string, mode: ReadingMode = 'PRACTICE') {
    const task = await this.prisma.readingDailyLifeTask.findUnique({ where: { id: taskId } });
    if (task === null) {
      throw new NotFoundException('Task not found');
    }

    await this.prisma.readingDailyLifeSession.updateMany({
      where: { userId, taskId, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' },
    });

    const questions = task.questions as unknown as SimpleQuestionEntity[];
    const timeLimitSec = mode === 'TOEFL' ? toeflTimeLimitSec(questions.length) : null;

    const session = await this.prisma.readingDailyLifeSession.create({
      data: { userId, taskId, answers: [], mode, timeLimitSec },
      select: { id: true, startedAt: true },
    });

    // The text stays visible for the whole task (ETS Blueprint); answers and skills are NOT exposed.
    return {
      sessionId: session.id,
      startedAt: session.startedAt,
      mode,
      timeLimitSec,
      format: task.format,
      text: task.text,
      questions: questions.map((q) => ({ id: q.id, text: q.text, options: q.options })),
    };
  }

  async startToeflModeSession(userId: string, targetLevel?: Level) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { currentLevel: true } });
    if (user === null) {
      throw new NotFoundException('User not found');
    }
    const level = targetLevel ?? user.currentLevel;

    const tasks = await this.prisma.readingDailyLifeTask.findMany({ where: { level }, select: { id: true } });
    if (tasks.length === 0) {
      throw new BadRequestException(`No Read in Daily Life tasks available for level ${level} yet.`);
    }

    const taskIds = tasks.map((t) => t.id);
    const sessions = await this.prisma.readingDailyLifeSession.findMany({
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

  async submitAnswers(userId: string, sessionId: string, answers: Array<{ questionId: string; selectedIndex: number }>, timezone?: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);
    const task = await this.prisma.readingDailyLifeTask.findUnique({ where: { id: session.taskId } });
    if (task === null) {
      throw new NotFoundException('Task no longer exists');
    }

    const questions = task.questions as unknown as SimpleQuestionEntity[];
    const answerMap = new Map(answers.map((a) => [a.questionId, a.selectedIndex]));

    const graded: SimpleAnswerEntity[] = [];
    const items: ReadingItemOutcome[] = [];

    for (const q of questions) {
      const selected = answerMap.get(q.id);
      const isCorrect = selected !== undefined && selected === q.correctIndex;

      graded.push({ questionId: q.id, selectedIndex: selected ?? -1, isCorrect });
      items.push({
        mistakeTargetId: readingMistakeTargetId('DAILY_LIFE', task.id, q.id),
        isCorrect,
        userAnswer: selected === undefined ? NO_ANSWER_LABEL : (q.options[selected] ?? String(selected)),
        correctAnswer: q.options[q.correctIndex] ?? '',
        category: 'LOGIC',
        tags: q.skill != null ? [`skill:${q.skill}`] : [],
      });
    }

    const correctCount = graded.filter((g) => g.isCorrect).length;
    const totalCount = questions.length;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const timeSpentSec = elapsedSec(session.startedAt);
    const timedOut = isTimedOut(session.mode, session.timeLimitSec, timeSpentSec);

    const priorCompleted = await this.prisma.readingDailyLifeSession.count({
      where: { userId, taskId: task.id, status: 'COMPLETED' },
    });
    const isFirstAttempt = priorCompleted === 0;

    const claim = await this.prisma.readingDailyLifeSession.updateMany({
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
      userId, kind: 'DAILY_LIFE', level: task.level, topic: task.topic, grammarTopics: task.grammarTopics,
      accuracy, isFirstAttempt, timeSpentSec, timezone, items,
    });
    await this.prisma.readingDailyLifeSession.update({ where: { id: sessionId }, data: { xpEarned: outcome.xpEarned } });

    return {
      correctCount, totalCount, accuracy, timeSpentSec, timedOut, mode: session.mode ?? 'PRACTICE',
      xpEarned: outcome.xpEarned,
      countedAsCompleted: outcome.countedAsCompleted,
      isLevelMatched: outcome.isLevelMatched,
      isFirstAttempt,
      progressRecorded: outcome.sideEffectsOk,
      results: questions.map((q) => ({
        questionId: q.id,
        isCorrect: graded.find((g) => g.questionId === q.id)?.isCorrect ?? false,
        correctIndex: q.correctIndex,
        explanation: q.explanation ?? undefined,
        skill: q.skill ?? undefined,
      })),
    };
  }

  async bulkCreate(items: CreateDailyLifeTaskDto[]) {
    // Validate EVERYTHING first (15-150 words, 2-3 questions, 4 options, correctIndex in range): no half-imported batch.
    items.forEach((item, i) => {
      const problems = validateDailyLife(item);
      if (problems.length > 0) {
        throw new BadRequestException(`items[${i}]: ${problems.join('; ')}`);
      }
    });

    const existing = await this.prisma.readingDailyLifeTask.findMany({
      where: { text: { in: items.map((i) => i.text.trim()) } },
      select: { text: true },
    });
    const seen = new Set(existing.map((e) => e.text));

    const toInsert = items
      .filter((item) => {
        const key = item.text.trim();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .map((item) => ({
        level: item.level,
        topic: item.topic ?? '',
        grammarTopics: item.grammarTopics ?? [],
        format: item.format,
        text: item.text.trim(),
        questions: item.questions.map((q) => ({
          id: randomUUID(), text: q.text, options: q.options, correctIndex: q.correctIndex,
          explanation: q.explanation, skill: q.skill,
        })),
      }));

    if (toInsert.length > 0) {
      await this.prisma.readingDailyLifeTask.createMany({ data: toInsert });
    }
    return { totalProcessed: items.length, inserted: toInsert.length, skipped: items.length - toInsert.length };
  }

  private async getOwnedInProgressSession(userId: string, sessionId: string) {
    const session = await this.prisma.readingDailyLifeSession.findUnique({ where: { id: sessionId } });
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