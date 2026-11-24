import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Level, Prisma, WritingType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { ProgressService } from '../progress/progress.service';
import type { CreateWritingPromptDto } from './dto/bulk-create-prompts.dto';
import {
  resolveWritingPolicy,
  resolveMaxCountedAttempts,
  WRITING_TIME_GRACE_SEC,
  MIN_RESUBMIT_INTERVAL_MS,
  type ScoredWritingType,
} from '../../constants/writing-constants';
import { computeSpacedWeight, weightedPickOne } from '../../common/utils/spaced-selection.util';
import { EXAM_LEVEL_RANGE } from 'src/constants/level-policy';

@Injectable()
export class WritingService {
  private readonly logger = new Logger(WritingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    @InjectQueue('writing-analysis') private readonly analysisQueue: Queue,
  ) { }

  async getPrompts(userId: string, level?: Level) {
    const where: Prisma.WritingPromptWhereInput = {};
    if (level !== undefined) where.level = level;

    const prompts = await this.prisma.writingPrompt.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
    if (prompts.length === 0) return [];

    const submissions = await this.prisma.writingSubmission.findMany({
      where: { userId, promptId: { in: prompts.map((p) => p.id) }, status: 'ANALYZED' },
      select: { promptId: true, analysis: true, submittedAt: true },
      orderBy: { submittedAt: 'desc' },
    });

    const historyByPrompt = new Map<string, { bestScore: number; attemptCount: number }>();
    for (const sub of submissions) {
      const analysis = sub.analysis as { overallScore?: number } | null;
      const score = analysis?.overallScore ?? 0;
      const existing = historyByPrompt.get(sub.promptId);
      if (existing === undefined) historyByPrompt.set(sub.promptId, { bestScore: score, attemptCount: 1 });
      else {
        existing.bestScore = Math.max(existing.bestScore, score);
        existing.attemptCount += 1;
      }
    }

    return prompts.map((p) => {
      const history = historyByPrompt.get(p.id);
      return {
        ...p,
        userBestScore: history?.bestScore ?? null,
        userAttemptCount: history?.attemptCount ?? 0,
        userStatus: history === undefined ? 'not_attempted' : history.bestScore >= 70 ? 'completed' : 'in_progress',
      };
    });
  }

  async getPromptById(id: string, userId: string) {
    const prompt = await this.prisma.writingPrompt.findUnique({ where: { id } });
    if (!prompt) throw new NotFoundException(`Prompt with ID ${id} not found`);

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { currentLevel: true } });
    if (user === null) throw new NotFoundException('User not found');

    if (prompt.type === 'BUILD_A_SENTENCE') return { ...prompt, effectivePolicy: null };

    const policy = resolveWritingPolicy(user.currentLevel, prompt.type as ScoredWritingType, {
      minWords: prompt.minWords,
      maxWords: prompt.maxWords,
      timeLimitSec: prompt.timeLimitSec,
    });

    return { ...prompt, effectivePolicy: policy };
  }

  async getPromptsByTypeAndTopic(type: WritingType, level?: Level, topic?: string) {
    const where: Prisma.WritingPromptWhereInput = { type };
    if (level !== undefined) where.level = level;
    if (topic !== undefined) where.topic = { contains: topic, mode: 'insensitive' };
    return this.prisma.writingPrompt.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async getAvailableTopics(type: WritingType, level?: Level) {
    const where: Prisma.WritingPromptWhereInput = { type, topic: { not: '' } };
    if (level !== undefined) where.level = level;
    const rows = await this.prisma.writingPrompt.findMany({ where, select: { topic: true }, distinct: ['topic'] });
    return rows.map((r) => r.topic).sort();
  }

  async startSession(userId: string, promptId: string) {
    const [prompt, user] = await Promise.all([
      this.prisma.writingPrompt.findUnique({ where: { id: promptId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { currentLevel: true } }),
    ]);

    if (prompt === null) throw new NotFoundException('Prompt not found');
    if (user === null) throw new NotFoundException('User not found');
    if (prompt.type === 'BUILD_A_SENTENCE') {
      throw new BadRequestException('Build a Sentence tasks are handled by the Scramble module.');
    }

    const lastSession = await this.prisma.writingSession.findFirst({
      where: { userId, promptId, status: 'SUBMITTED' },
      orderBy: { submittedAt: 'desc' },
      select: { submittedAt: true },
    });

    if (lastSession?.submittedAt) {
      const elapsed = Date.now() - lastSession.submittedAt.getTime();
      if (elapsed < MIN_RESUBMIT_INTERVAL_MS) {
        const waitMinutes = Math.ceil((MIN_RESUBMIT_INTERVAL_MS - elapsed) / 60000);
        throw new BadRequestException(`Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''} before starting a new attempt on this prompt.`);
      }
    }

    await this.prisma.writingSession.updateMany({
      where: { userId, promptId, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' },
    });

    const policy = resolveWritingPolicy(user.currentLevel, prompt.type as ScoredWritingType, {
      minWords: prompt.minWords,
      maxWords: prompt.maxWords,
      timeLimitSec: prompt.timeLimitSec,
    });

    const session = await this.prisma.writingSession.create({
      data: { userId, promptId, minWords: policy.minWords, maxWords: policy.maxWords, timeLimitSec: policy.timeLimitSec },
      select: { id: true, minWords: true, maxWords: true, timeLimitSec: true, startedAt: true },
    });

    return {
      sessionId: session.id,
      minWords: session.minWords,
      maxWords: session.maxWords,
      timeLimitSec: session.timeLimitSec,
      startedAt: session.startedAt,
      prompt: {
        id: prompt.id,
        type: prompt.type,
        prompt: prompt.prompt,
        discussionPeerResponses: prompt.discussionPeerResponses,
        topic: prompt.topic,
      },
    };
  }

  // Две независимые кнопки — задания не смешиваются и не выбираются рандомно между собой.
  async startToeflEmailSession(userId: string) {
    return this.startToeflSessionForType(userId, 'EMAIL');
  }

  async startToeflDiscussionSession(userId: string) {
    return this.startToeflSessionForType(userId, 'ACADEMIC_DISCUSSION');
  }

  private async startToeflSessionForType(userId: string, type: ScoredWritingType) {
    const prompts = await this.prisma.writingPrompt.findMany({
      where: { level: { in: [...EXAM_LEVEL_RANGE] }, type },
      select: { id: true },
    });
    if (prompts.length === 0) {
      throw new BadRequestException(`No ${type} prompts available yet.`);
    }

    const submissions = await this.prisma.writingSubmission.findMany({
      where: { userId, promptId: { in: prompts.map((p) => p.id) }, status: 'ANALYZED' },
      select: { promptId: true, analysis: true, submittedAt: true },
      orderBy: { submittedAt: 'desc' },
    });

    const lastByPrompt = new Map<string, { score: number; at: Date }>();
    for (const s of submissions) {
      if (!lastByPrompt.has(s.promptId)) {
        const score = (s.analysis as { overallScore?: number } | null)?.overallScore ?? 0;
        lastByPrompt.set(s.promptId, { score, at: s.submittedAt });
      }
    }

    const candidates = prompts.map((p) => {
      const last = lastByPrompt.get(p.id);
      const weight = computeSpacedWeight({
        id: p.id,
        lastOutcome: last === undefined ? undefined : last.score >= 70 ? 'correct' : 'incorrect',
        lastAttemptAt: last?.at,
      });
      return { id: p.id, weight };
    });

    const picked = weightedPickOne(candidates);
    if (picked === null) throw new BadRequestException('No prompts available right now — try again later.');

    return this.startSession(userId, picked.id);
  }

  async submitSession(userId: string, sessionId: string, text: string) {
    const session = await this.prisma.writingSession.findUnique({ where: { id: sessionId } });
    if (session === null) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('Access denied');
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Session is already ${session.status.toLowerCase()}`);
    }

    const elapsedSec = (Date.now() - session.startedAt.getTime()) / 1000;
    const timeSpentSec = Math.min(Math.round(elapsedSec), session.timeLimitSec);

    if (elapsedSec > session.timeLimitSec + WRITING_TIME_GRACE_SEC) {
      this.logger.warn('WRITING_SESSION_SUBMITTED_LATE', {
        sessionId,
        timeLimitSec: session.timeLimitSec,
        elapsedSec: Math.round(elapsedSec),
      });
    }

    const [prompt, user] = await Promise.all([
      this.prisma.writingPrompt.findUniqueOrThrow({ where: { id: session.promptId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { currentLevel: true, streak: true } }),
    ]);
    if (user === null) throw new NotFoundException('User not found');

    const claim = await this.prisma.writingSession.updateMany({
      where: { id: sessionId, status: 'IN_PROGRESS' },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
    if (claim.count === 0) throw new BadRequestException('Session was already submitted');

    const attemptCount = await this.prisma.writingSubmission.count({
      where: { userId, promptId: session.promptId, status: 'ANALYZED' },
    });

    const submission = await this.prisma.writingSubmission.create({
      data: { userId, promptId: session.promptId, sessionId, text, timeSpentSec, status: 'PENDING' },
    });

    await this.prisma.writingSession.update({ where: { id: sessionId }, data: { submissionId: submission.id } });

    const maxCountedAttempts = resolveMaxCountedAttempts(user.currentLevel);

    const payload = {
      submissionId: submission.id,
      text,
      minWords: session.minWords,
      writingType: prompt.type,
      promptText: prompt.prompt,
      discussionPeerResponses: prompt.discussionPeerResponses,
      userLevel: user.currentLevel,
      streak: user.streak,
      attemptCount,
      maxCountedAttempts,
    };

    try {
      await this.analysisQueue.add('analyze', payload, { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: true });
    } catch {
      this.logger.error('WRITING_QUEUE_FAILED', { submissionId: submission.id });
      await this.prisma.writingSubmission.update({ where: { id: submission.id }, data: { status: 'ERROR' } });
      throw new InternalServerErrorException('Analysis service unavailable. Please try again.');
    }

    return { submissionId: submission.id, status: 'PENDING', attemptNumber: attemptCount + 1, willCountForProgress: attemptCount < maxCountedAttempts };
  }

  async getSubmission(id: string, userId: string) {
    const submission = await this.prisma.writingSubmission.findFirst({ where: { id, userId }, include: { prompt: true } });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async getSubmissions(userId: string, promptId?: string) {
    const where: Prisma.WritingSubmissionWhereInput = { userId };
    if (promptId !== undefined) where.promptId = promptId;
    return this.prisma.writingSubmission.findMany({ where, orderBy: { submittedAt: 'desc' }, include: { prompt: true }, take: 50 });
  }

  async getUserStats(userId: string) {
    const submissions = await this.prisma.writingSubmission.findMany({
      where: { userId, status: 'ANALYZED' },
      select: { analysis: true, submittedAt: true, promptId: true },
      orderBy: { submittedAt: 'desc' },
    });
    if (submissions.length === 0) return { totalSubmissions: 0, avgScore: null, bestScore: null, recentTrend: null };

    const scores = submissions.map((s) => (s.analysis as { overallScore?: number } | null)?.overallScore ?? null).filter((s): s is number => s !== null);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, v) => a + v, 0) / scores.length) : null;
    const bestScore = scores.length > 0 ? Math.round(Math.max(...scores)) : null;

    const recent = scores.slice(0, 3);
    const previous = scores.slice(3, 6);
    let recentTrend: 'improving' | 'declining' | 'stable' | null = null;
    if (recent.length >= 2 && previous.length >= 2) {
      const recentAvg = recent.reduce((a, v) => a + v, 0) / recent.length;
      const previousAvg = previous.reduce((a, v) => a + v, 0) / previous.length;
      const diff = recentAvg - previousAvg;
      recentTrend = diff > 3 ? 'improving' : diff < -3 ? 'declining' : 'stable';
    }

    return { totalSubmissions: submissions.length, avgScore, bestScore, recentTrend };
  }

  async bulkCreatePrompts(prompts: CreateWritingPromptDto[]) {
    if (prompts.length === 0) return { totalProcessed: 0, inserted: 0, skipped: 0 };
    const existing = await this.prisma.writingPrompt.findMany({ where: { prompt: { in: prompts.map((p) => p.prompt) } }, select: { prompt: true } });
    const existingSet = new Set(existing.map((e) => e.prompt));
    const toInsert = prompts.filter((p) => !existingSet.has(p.prompt));
    if (toInsert.length > 0) await this.prisma.writingPrompt.createMany({ data: toInsert });
    return { totalProcessed: prompts.length, inserted: toInsert.length, skipped: existing.length };
  }
}