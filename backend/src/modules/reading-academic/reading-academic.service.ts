import { randomUUID } from 'crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AcademicQuestionType, ErrorCategory, Level } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookmarksService } from '../bookmarks/bookmarks.service';
import { ReadingCompletionService, type ReadingItemOutcome } from '../reading-common/reading-completion.service';
import { pickTaskForToeflMode, toPickableTasks, withTaskListMeta } from '../../common/utils/reading-task-picker.util';
import { validateAcademicPassage } from '../../common/utils/reading-content.util';
import { taskFilterWhere } from '../../common/utils/task-filter.util';
import {
  ACADEMIC_PASSAGE_QUESTIONS, elapsedSec, isTimedOut, NO_ANSWER_LABEL, OFFICIAL_ACADEMIC_QUESTION_TYPES,
  readingMistakeTargetId, toeflTimeLimitSec, type ReadingMode,
} from '../../constants/reading-toefl-constants';
import type { CreateAcademicPassageDto, GetAcademicPassageDto } from './dto/academic-passage.dto';

interface AcademicQuestionEntity {
  id: string;
  type: AcademicQuestionType;
  text: string;
  explanation?: string;
  options: string[];
  correctIndex?: number;
  sentenceToInsert?: string; // LEGACY
  correctMarkerIndex?: number; // LEGACY
}

interface AcademicAnswerEntity {
  questionId: string;
  selectedIndex?: number;
  selectedMarkerIndex?: number;
  isCorrect: boolean;
}

interface AcademicAnswerInput {
  questionId: string;
  selectedIndex?: number;
  selectedMarkerIndex?: number;
}

@Injectable()
export class ReadingAcademicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly completion: ReadingCompletionService,
    private readonly bookmarks: BookmarksService,
  ) {}

  async findAll(userId: string, query: GetAcademicPassageDto) {
    const tasks = await this.prisma.readingAcademicPassage.findMany({
      where: { ...taskFilterWhere(query), ...(query.subject !== undefined ? { subject: query.subject } : {}) },
      select: { id: true, level: true, topic: true, subject: true, title: true, grammarTopics: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const ids = tasks.map((t) => t.id);

    const [sessions, bookmarked] = await Promise.all([
      this.prisma.readingAcademicSession.findMany({
        where: { userId, taskId: { in: ids }, status: 'COMPLETED' },
        select: { taskId: true, finalScore: true },
      }),
      this.bookmarks.getBookmarkedSet(userId, 'READING_ACADEMIC', ids),
    ]);

    return withTaskListMeta(tasks, sessions, bookmarked);
  }

  async startSession(userId: string, taskId: string, mode: ReadingMode = 'PRACTICE') {
    const task = await this.prisma.readingAcademicPassage.findUnique({ where: { id: taskId } });
    if (task === null) {
      throw new NotFoundException('Task not found');
    }

    await this.prisma.readingAcademicSession.updateMany({
      where: { userId, taskId, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' },
    });

    const questions = task.questions as unknown as AcademicQuestionEntity[];
    const timeLimitSec = mode === 'TOEFL' ? toeflTimeLimitSec(questions.length) : null;

    const session = await this.prisma.readingAcademicSession.create({
      data: { userId, taskId, answers: [], mode, timeLimitSec },
      select: { id: true, startedAt: true },
    });

    return {
      sessionId: session.id,
      startedAt: session.startedAt,
      mode,
      timeLimitSec,
      title: task.title,
      passage: task.passage,
      insertMarkers: task.insertMarkers, // legacy tasks only
      questions: questions.map((q) => this.toPublicQuestion(q)),
    };
  }

  async startToeflModeSession(userId: string, targetLevel?: Level) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { currentLevel: true } });
    if (user === null) {
      throw new NotFoundException('User not found');
    }
    const level = targetLevel ?? user.currentLevel;

    const candidates = await this.prisma.readingAcademicPassage.findMany({
      where: { level },
      select: { id: true, questions: { select: { type: true } } },
    });

    // TOEFL mode serves only tasks made of 2026-spec question types (no legacy Insert Sentence etc.).
    const tasks = candidates.filter(
      (t) => t.questions.length === ACADEMIC_PASSAGE_QUESTIONS && t.questions.every((q) => OFFICIAL_ACADEMIC_QUESTION_TYPES.includes(q.type)),
    );
    if (tasks.length === 0) {
      throw new BadRequestException(`No TOEFL-format Academic Passage tasks available for level ${level} yet.`);
    }

    const taskIds = tasks.map((t) => t.id);
    const sessions = await this.prisma.readingAcademicSession.findMany({
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

  async submitAnswers(userId: string, sessionId: string, answers: AcademicAnswerInput[], timezone?: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);
    const task = await this.prisma.readingAcademicPassage.findUnique({ where: { id: session.taskId } });
    if (task === null) {
      throw new NotFoundException('Task no longer exists');
    }

    const questions = task.questions as unknown as AcademicQuestionEntity[];
    const answerMap = new Map(answers.map((a) => [a.questionId, a]));

    const graded: AcademicAnswerEntity[] = [];
    const items: ReadingItemOutcome[] = [];

    for (const q of questions) {
      const a = answerMap.get(q.id);
      const isCorrect = a !== undefined && this.gradeOne(q, a);

      graded.push({ questionId: q.id, selectedIndex: a?.selectedIndex, selectedMarkerIndex: a?.selectedMarkerIndex, isCorrect });
      items.push({
        mistakeTargetId: readingMistakeTargetId('ACADEMIC_PASSAGE', task.id, q.id),
        isCorrect,
        userAnswer: this.describeAnswer(q, a),
        correctAnswer: this.describeCorrectAnswer(q),
        category: this.categoryOf(q.type),
        tags: [`qtype:${q.type}`],
      });
    }

    const correctCount = graded.filter((g) => g.isCorrect).length;
    const totalCount = questions.length;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const timeSpentSec = elapsedSec(session.startedAt);
    const timedOut = isTimedOut(session.mode, session.timeLimitSec, timeSpentSec);

    const priorCompleted = await this.prisma.readingAcademicSession.count({
      where: { userId, taskId: task.id, status: 'COMPLETED' },
    });
    const isFirstAttempt = priorCompleted === 0;

    const claim = await this.prisma.readingAcademicSession.updateMany({
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
      userId, kind: 'ACADEMIC_PASSAGE', level: task.level, topic: task.topic, grammarTopics: task.grammarTopics,
      accuracy, isFirstAttempt, timeSpentSec, timezone, items,
    });
    await this.prisma.readingAcademicSession.update({ where: { id: sessionId }, data: { xpEarned: outcome.xpEarned } });

    return {
      correctCount, totalCount, accuracy, timeSpentSec, timedOut, mode: session.mode ?? 'PRACTICE',
      xpEarned: outcome.xpEarned,
      countedAsCompleted: outcome.countedAsCompleted,
      isLevelMatched: outcome.isLevelMatched,
      isFirstAttempt,
      progressRecorded: outcome.sideEffectsOk,
      results: questions.map((q) => ({
        questionId: q.id,
        type: q.type,
        isCorrect: graded.find((g) => g.questionId === q.id)?.isCorrect ?? false,
        explanation: q.explanation,
        correctIndex: q.correctIndex,
        correctMarkerIndex: q.correctMarkerIndex,
      })),
    };
  }

  async bulkCreate(items: CreateAcademicPassageDto[]) {
    items.forEach((item, i) => {
      const problems = validateAcademicPassage(item);
      if (problems.length > 0) {
        throw new BadRequestException(`items[${i}]: ${problems.join('; ')}`);
      }
    });

    const existing = await this.prisma.readingAcademicPassage.findMany({
      where: { title: { in: items.map((i) => i.title.trim()) } },
      select: { title: true },
    });
    const seen = new Set(existing.map((e) => e.title));

    const toInsert = items
      .filter((item) => {
        const key = item.title.trim();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .map((item) => ({
        level: item.level,
        topic: item.topic,
        subject: item.subject,
        grammarTopics: item.grammarTopics ?? [],
        title: item.title.trim(),
        passage: item.passage,
        insertMarkers: [],
        questions: item.questions.map((q) => ({
          id: randomUUID(), type: q.type, text: q.text, explanation: q.explanation, options: q.options, correctIndex: q.correctIndex,
        })),
      }));

    if (toInsert.length > 0) {
      await this.prisma.readingAcademicPassage.createMany({ data: toInsert });
    }
    return { totalProcessed: items.length, inserted: toInsert.length, skipped: items.length - toInsert.length };
  }

  private gradeOne(q: AcademicQuestionEntity, a: AcademicAnswerInput): boolean {
    if (q.type === 'INSERT_SENTENCE') {
      return a.selectedMarkerIndex !== undefined && a.selectedMarkerIndex === q.correctMarkerIndex;
    }
    return a.selectedIndex !== undefined && a.selectedIndex === q.correctIndex;
  }

  private toPublicQuestion(q: AcademicQuestionEntity) {
    const isLegacyInsert = q.type === 'INSERT_SENTENCE';
    return {
      id: q.id,
      type: q.type,
      text: q.text,
      options: isLegacyInsert ? undefined : q.options,
      sentenceToInsert: isLegacyInsert ? q.sentenceToInsert : undefined,
    };
  }

  // Vocabulary-in-context errors feed the VOCABULARY weak-spot analytics; the rest is comprehension (LOGIC).
  private categoryOf(type: AcademicQuestionType): ErrorCategory {
    return type === 'VOCAB_IN_CONTEXT' ? 'VOCABULARY' : 'LOGIC';
  }

  private describeAnswer(q: AcademicQuestionEntity, a: AcademicAnswerInput | undefined): string {
    if (a === undefined) {
      return NO_ANSWER_LABEL;
    }
    if (q.type === 'INSERT_SENTENCE') {
      return a.selectedMarkerIndex === undefined ? NO_ANSWER_LABEL : `marker_${a.selectedMarkerIndex}`;
    }
    return a.selectedIndex === undefined ? NO_ANSWER_LABEL : (q.options[a.selectedIndex] ?? String(a.selectedIndex));
  }

  private describeCorrectAnswer(q: AcademicQuestionEntity): string {
    if (q.type === 'INSERT_SENTENCE') {
      return `marker_${q.correctMarkerIndex ?? ''}`;
    }
    return q.correctIndex === undefined ? '' : (q.options[q.correctIndex] ?? String(q.correctIndex));
  }

  private async getOwnedInProgressSession(userId: string, sessionId: string) {
    const session = await this.prisma.readingAcademicSession.findUnique({ where: { id: sessionId } });
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