import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import nlp from 'compromise';


@Injectable()
export class WritingService {
    constructor(
        private readonly prisma: PrismaService
    ) { }

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
        if (!id) {
            throw new BadRequestException('ID is required');
        }

        const prompt = await this.prisma.writingPrompt.findUnique({
            where: { id }
        });

        if (!prompt) {
            throw new NotFoundException(`Prompt with ID ${id} not found`);
        }

        return prompt;
    }



    async submit(userId: string, promptId: string, text: string) {
        const prompt = await this.prisma.writingPrompt.findUnique({ where: { id: promptId } });
        if (!prompt) throw new NotFoundException('Prompt not found');

        // Предварительная валидация через NLP, чтобы не пускать мусор в базу
        const doc = nlp(text);
        const wordCount = doc.terms().out('array').length;

        if (wordCount < Math.floor(prompt.minWords * 0.5)) {
            throw new BadRequestException(`Text is too short. Minimum ${prompt.minWords} words required.`);
        }

        // 1. Быстро создаем запись в БД
        const submission = await this.prisma.writingSubmission.create({
            data: {
                userId,
                promptId,
                text,
                status: 'PENDING',
                submittedAt: new Date(),
            },
        });

        // 2. Отправляем в фоновую очередь (с настройками надежности)
        await this.analysisQueue.add(
            'analyze',
            {
                submissionId: submission.id,
                text,
                minWords: prompt.minWords,
            },
            {
                attempts: 3, // Если API упадет, Nest попробует еще 3 раза
                backoff: {
                    type: 'exponential',
                    delay: 2000, // Задержка перед повторами: 2с, 4с, 8с
                },
                removeOnComplete: true, // Чистим Redis от успешных задач
            },
        );

        // 3. Моментально отвечаем юзеру
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

    async bulkCreatePrompts(prompts: any[]) {
        let inserted = 0, skipped = 0, errors = 0;

        for (const p of prompts) {
            try {
                await this.prisma.writingPrompt.create({
                    data: {
                        prompt: p.prompt,
                        level: p.level,
                        type: p.type,
                        minWords: p.minWords,
                        maxWords: p.maxWords,
                        topic: p.topic,
                        instructions: p.instructions
                    }
                });
                inserted++;
            } catch (error) {
                errors++;
            }
        }

        return { inserted, skipped, errors };
    }
}