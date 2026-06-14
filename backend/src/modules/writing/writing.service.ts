import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import nlp from 'compromise';
import { ProgressService } from '../progress/progress.service';
import { computeXP, XP_BASE, isSessionCountable } from '../../constants/level-requirements';
import type { CreateWritingPromptDto } from './dto/bulk-create-prompts.dto';

const MIN_RESUBMIT_INTERVAL_MS = 5 * 60 * 1000;

const MAX_COUNTED_ATTEMPTS = 3;

@Injectable()
export class WritingService {
  private readonly logger = new Logger(WritingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    @InjectQueue('writing-analysis') private readonly analysisQueue: Queue,
  ) {}

  async getPrompts(userId: string, level?: Level) {
    const where: Prisma.WritingPromptWhereInput = {};
    if (level !== undefined) where.level = level;

    const prompts = await this.prisma.writingPrompt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (prompts.length === 0) return [];

    const submissions = await this.prisma.writingSubmission.findMany({
      where: {
        userId,
        promptId: { in: prompts.map((p) => p.id) },
        status: 'ANALYZED',
      },
      select: {
        promptId: true,
        analysis: true,
        submittedAt: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    const historyByPrompt = new Map<string, { bestScore: number; attemptCount: number }>();
    for (const sub of submissions) {
      const analysis = sub.analysis as { overallScore?: number } | null;
      const score = analysis?.overallScore ?? 0;
      const existing = historyByPrompt.get(sub.promptId);
      if (existing === undefined) {
        historyByPrompt.set(sub.promptId, { bestScore: score, attemptCount: 1 });
      } else {
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
        userStatus:
          history === undefined
            ? 'not_attempted'
            : history.bestScore >= 70
              ? 'completed'
              : 'in_progress',
      };
    });
  }

  async getPromptById(id: string) {
    if (!id) throw new BadRequestException('ID is required');
    const prompt = await this.prisma.writingPrompt.findUnique({ where: { id } });
    if (!prompt) throw new NotFoundException(`Prompt with ID ${id} not found`);
    return prompt;
  }

  async submit(userId: string, promptId: string, text: string, timezone?: string) {
    const [prompt, user] = await Promise.all([
      this.prisma.writingPrompt.findUnique({ where: { id: promptId } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { currentLevel: true, streak: true },
      }),
    ]);

    if (!prompt) throw new NotFoundException('Prompt not found');
    if (!user) throw new NotFoundException('User not found');

    const doc = nlp(text);
    const wordCount = doc.terms().out('array').length;

    if (wordCount < Math.floor(prompt.minWords * 0.5)) {
      throw new BadRequestException(
        `Text is too short (${wordCount} words). Minimum ${prompt.minWords} words required.`,
      );
    }

    const lastSubmission = await this.prisma.writingSubmission.findFirst({
      where: { userId, promptId },
      orderBy: { submittedAt: 'desc' },
      select: { submittedAt: true, id: true, status: true },
    });

    if (lastSubmission !== null) {
      const elapsed = Date.now() - lastSubmission.submittedAt.getTime();
      if (elapsed < MIN_RESUBMIT_INTERVAL_MS) {
        const waitMinutes = Math.ceil((MIN_RESUBMIT_INTERVAL_MS - elapsed) / 60000);
        throw new BadRequestException(
          `Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''} before resubmitting this prompt.`,
        );
      }
    }

    const attemptCount = await this.prisma.writingSubmission.count({
      where: { userId, promptId, status: 'ANALYZED' },
    });

    const submission = await this.prisma.writingSubmission.create({
      data: {
        userId,
        promptId,
        text,
        status: 'PENDING',
        submittedAt: new Date(),
      },
    });

    const payload = {
      submissionId: submission.id,
      text,
      minWords: prompt.minWords,
      userLevel: user.currentLevel,
      streak: user.streak,
      attemptCount,
      maxCountedAttempts: MAX_COUNTED_ATTEMPTS,
      timezone,
    };

    try {
      await this.analysisQueue.add('analyze', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      });
    } catch (err: unknown) {
      this.logger.error('WRITING_QUEUE_FAILED', { submissionId: submission.id });
      await this.prisma.writingSubmission.update({
        where: { id: submission.id },
        data: { status: 'ERROR' },
      });
      throw new InternalServerErrorException('Analysis service unavailable. Please try again.');
    }

    return {
      submissionId: submission.id,
      status: 'PENDING',
      attemptNumber: attemptCount + 1,
      willCountForProgress: attemptCount < MAX_COUNTED_ATTEMPTS,
    };
  }

  async getSubmission(id: string, userId: string) {
    const submission = await this.prisma.writingSubmission.findFirst({
      where: { id, userId },
      include: { prompt: true },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async getSubmissions(userId: string, promptId?: string) {
    const where: Prisma.WritingSubmissionWhereInput = { userId };
    if (promptId !== undefined) where.promptId = promptId;

    return this.prisma.writingSubmission.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      include: { prompt: true },
      take: 50,
    });
  }

  async getUserStats(userId: string) {
    const submissions = await this.prisma.writingSubmission.findMany({
      where: { userId, status: 'ANALYZED' },
      select: { analysis: true, submittedAt: true, promptId: true },
      orderBy: { submittedAt: 'desc' },
    });

    if (submissions.length === 0) {
      return { totalSubmissions: 0, avgScore: null, bestScore: null, recentTrend: null };
    }

    const scores = submissions
      .map((s) => (s.analysis as { overallScore?: number } | null)?.overallScore ?? null)
      .filter((s): s is number => s !== null);

    const avgScore =
      scores.length > 0 ? Math.round(scores.reduce((a, v) => a + v, 0) / scores.length) : null;
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

    return {
      totalSubmissions: submissions.length,
      avgScore,
      bestScore,
      recentTrend,
    };
  }

  async bulkCreatePrompts(prompts: CreateWritingPromptDto[]): Promise<{
    totalProcessed: number;
    inserted: number;
    skipped: number;
  }> {
    if (prompts.length === 0) return { totalProcessed: 0, inserted: 0, skipped: 0 };

    const existing = await this.prisma.writingPrompt.findMany({
      where: { prompt: { in: prompts.map((p) => p.prompt) } },
      select: { prompt: true },
    });

    const existingSet = new Set(existing.map((e) => e.prompt));
    const toInsert = prompts.filter((p) => !existingSet.has(p.prompt));

    if (toInsert.length > 0) {
      await this.prisma.writingPrompt.createMany({ data: toInsert });
    }

    return { totalProcessed: prompts.length, inserted: toInsert.length, skipped: existing.length };
  }
}
