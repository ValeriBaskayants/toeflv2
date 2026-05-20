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
import { CreateWritingPromptDto } from './dto/bulk-create-prompts.dto';

@Injectable()
export class WritingService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('writing-analysis') private readonly analysisQueue: Queue,
  ) {}

  private readonly logger = new Logger(WritingService.name);

  async getPrompts(level?: Level) {
    const where: Prisma.WritingPromptWhereInput = {};
    if (level !== undefined) where.level = level;

    return this.prisma.writingPrompt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getPromptById(id: string) {
    if (!id) throw new BadRequestException('ID is required');
    const prompt = await this.prisma.writingPrompt.findUnique({ where: { id } });
    if (!prompt) throw new NotFoundException(`Prompt with ID ${id} not found`);
    return prompt;
  }

  async submit(userId: string, promptId: string, text: string) {
    const prompt = await this.prisma.writingPrompt.findUnique({ where: { id: promptId } });
    if (!prompt) throw new NotFoundException('Prompt not found');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentLevel: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const doc = nlp(text);
    const wordCount = doc.terms().out('array').length;

    if (wordCount < Math.floor(prompt.minWords * 0.5)) {
      throw new BadRequestException(
        `Text is too short. Minimum ${prompt.minWords} words required.`,
      );
    }

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
    };

    const options = {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
    };

    try {
      await this.analysisQueue.add('analyze', payload, options);
    } catch (err: unknown) {
      this.logger.error('WRITING_QUEUE_FAILED', { submissionId: submission.id });

      await this.prisma.writingSubmission.update({
        where: { id: submission.id },
        data: { status: 'ERROR' },
      });
      throw new InternalServerErrorException('Analysis service unavailable. Please try again.');
    }

    return { submissionId: submission.id, status: 'PENDING' };
  }

  async getSubmission(id: string, userId: string) {
    const submission = await this.prisma.writingSubmission.findFirst({
      where: { id, userId },
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

  async bulkCreatePrompts(prompts: CreateWritingPromptDto[]): Promise<{
    totalProcessed: number;
    inserted: number;
    skipped: number;
  }> {
    if (prompts.length === 0) {
      return { totalProcessed: 0, inserted: 0, skipped: 0 };
    }

    const existing = await this.prisma.writingPrompt.findMany({
      where: { prompt: { in: prompts.map((p) => p.prompt) } },
      select: { prompt: true },
    });

    const existingSet = new Set(existing.map((e) => e.prompt));
    const toInsert = prompts.filter((p) => !existingSet.has(p.prompt));

    if (toInsert.length > 0) {
      await this.prisma.writingPrompt.createMany({ data: toInsert });
    }

    return {
      totalProcessed: prompts.length,
      inserted: toInsert.length,
      skipped: existing.length,
    };
  }
}
