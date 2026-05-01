import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import nlp from 'compromise';

@Processor('writing-analysis')
export class WritingProcessor {
    private readonly logger = new Logger(WritingProcessor.name);

    constructor(private readonly prisma: PrismaService) { }

    @Process('analyze')
    async handleAnalysis(job: Job<{ submissionId: string; text: string; minWords: number }>) {
        const { submissionId, text, minWords } = job.data;

        try {
            // 1. Точный NLP парсинг
            const doc = nlp(text);
            const words = doc.terms().out('array').length || 1;
            const sentences = doc.sentences().out('array').length || 1;

            // 2. Запрос к LanguageTool
            const res = await fetch('https://api.languagetool.org/v2/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ text, language: 'en-US', enabledOnly: 'false' }).toString(),
                signal: AbortSignal.timeout(15000),
            });

            const data: any = await res.json();
            const matches = data.matches || [];
            const errorCount = matches.length;

            // 3. Алгоритм оценки
            const errorDensity = (errorCount / words) * 100;
            const grammarScore = Math.max(0, Math.round(100 - errorDensity * 15));
            const taskScore = words >= minWords ? 100 : Math.round((words / minWords) * 100);

            const avgWordsPerSentence = words / sentences;
            let coherenceScore = 100;
            if (avgWordsPerSentence < 8) {
                coherenceScore -= (8 - avgWordsPerSentence) * 5;
            } else if (avgWordsPerSentence > 25) {
                coherenceScore -= (avgWordsPerSentence - 25) * 3;
            }
            coherenceScore = Math.max(40, Math.min(100, Math.round(coherenceScore)));

            const analysis = {
                overallScore: Math.round((grammarScore + taskScore + coherenceScore) / 3),
                grammarScore,
                taskScore,
                coherenceScore,
                errorCount,
                wordCount: words,
                errors: matches.map((e: any) => ({
                    message: e.message,
                    context: e.context?.text || '',
                    offset: e.offset,
                    length: e.length,
                    replacements: (e.replacements || []).slice(0, 3).map((r: any) => r.value),
                })),
            };

            // 4. Обновление БД
            await this.prisma.writingSubmission.update({
                where: { id: submissionId },
                data: { analysis, status: 'ANALYZED' },
            });

        } catch (error) {
            this.logger.error(`Analysis failed for ${submissionId}`, error);
            // Если все попытки Bull исчерпаны, ставим статус ERROR
            if (job.attemptsMade >= 2) {
                await this.prisma.writingSubmission.update({
                    where: { id: submissionId },
                    data: { status: 'ERROR' },
                });
            }
            throw error; // Бросаем ошибку, чтобы Bull сделал retry
        }
    }
}