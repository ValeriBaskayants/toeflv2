import { randomUUID } from 'crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MistakesService } from '../mistakes/mistakes.service';
import { ProgressService } from '../progress/progress.service';
import { GeminiWritingService } from '../gemini-writin/gemini-writing.service';
import { checkHardConstraints, PENCIL_PROTOCOL_PAUSE_SEC } from '../../constants/deep-practice-constants';
import type { ErrorCategory } from '@prisma/client';
import type { CreateTopicDto, GetTopicsDto } from './dto/deep-practice.dto';

interface DeepPracticeCardEntity {
  id: string;
  trigger: string;
  pattern: string;
  coreReason: string;
  category: string;
  createdAt: string;
}

@Injectable()
export class DeepPracticeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mistakes: MistakesService,
    private readonly progress: ProgressService,
    private readonly gemini: GeminiWritingService,
  ) {}

  // ── Темы ─────────────────────────────────────────────────────────────────

  async getTopics(query: GetTopicsDto) {
    const where: Prisma.DeepPracticeTopicWhereInput = {};
    if (query.level !== undefined) where.level = query.level;

    return this.prisma.deepPracticeTopic.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async bulkCreateTopics(topics: CreateTopicDto[]) {
    if (topics.length === 0) return { totalProcessed: 0, inserted: 0, skipped: 0 };

    const existing = await this.prisma.deepPracticeTopic.findMany({
      where: { OR: topics.map((t) => ({ core: t.core, constraint: t.constraint })) },
      select: { core: true, constraint: true },
    });
    const existingKeys = new Set(existing.map((e) => `${e.core}:${e.constraint}`));
    const toInsert = topics.filter((t) => !existingKeys.has(`${t.core}:${t.constraint}`));

    if (toInsert.length > 0) {
      await this.prisma.deepPracticeTopic.createMany({
        data: toInsert.map((t) => ({ core: t.core, constraint: t.constraint, level: t.level ?? 'C1' })),
      });
    }

    return { totalProcessed: topics.length, inserted: toInsert.length, skipped: existing.length };
  }

  // ── Жизненный цикл записи ────────────────────────────────────────────────

  async startEntry(userId: string, topicId: string) {
    const topic = await this.prisma.deepPracticeTopic.findUnique({ where: { id: topicId } });
    if (topic === null) throw new NotFoundException('Topic not found');

    const entry = await this.prisma.deepPracticeEntry.create({
      data: { userId, topicId, text: '', status: 'DRAFT' },
      select: { id: true, createdAt: true },
    });

    return {
      entryId: entry.id,
      topic: { core: topic.core, constraint: topic.constraint, level: topic.level },
    };
  }

  async markTextFinished(userId: string, entryId: string, text: string) {
    const entry = await this.getOwnedEntry(userId, entryId, ['DRAFT', 'PAUSED']);

    const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
    const violations = checkHardConstraints(sentences);

    const now = new Date();
    const pauseUntil = new Date(now.getTime() + PENCIL_PROTOCOL_PAUSE_SEC * 1000);

    await this.prisma.deepPracticeEntry.update({
      where: { id: entryId },
      data: {
        text,
        status: 'PAUSED',
        textFinishedAt: now,
        pauseRequiredUntil: pauseUntil,
        sentenceCount: sentences.length,
        maxSentenceWordCount: sentences.length > 0
          ? Math.max(...sentences.map((s) => s.trim().split(/\s+/).filter(Boolean).length))
          : 0,
        bannedWordsFound: violations.filter((v) => v.rule === 'BANNED_WORD').map((v) => v.message),
      },
    });

    return {
      violations,
      canSubmitAt: pauseUntil.toISOString(),
      pauseRequiredSec: PENCIL_PROTOCOL_PAUSE_SEC,
      reminder: 'Hands off the keyboard. Re-read for typos, double spaces, missing periods, articles, and -s endings — this is not busy-waiting, it is the check itself.',
    };
  }

  async submit(userId: string, entryId: string) {
    const entry = await this.getOwnedEntry(userId, entryId, ['PAUSED']);

    if (entry.textFinishedAt === null || entry.pauseRequiredUntil === null) {
      throw new BadRequestException('Call markTextFinished before submitting.');
    }
    if (new Date() < entry.pauseRequiredUntil) {
      const remainingSec = Math.ceil((entry.pauseRequiredUntil.getTime() - Date.now()) / 1000);
      throw new BadRequestException(`Pencil Protocol: ${remainingSec}s remaining before you can submit.`);
    }

    // Пере-валидируем жёсткие правила на СОХРАНЁННОМ тексте — не на новом,
    // который теоретически можно было бы прислать в этом запросе (его тут
    // нет намеренно, см. объяснение выше).
    const sentences = entry.text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
    const violations = checkHardConstraints(sentences);
    if (violations.length > 0) {
      throw new BadRequestException({ message: 'Hard constraints violated — fix and call markTextFinished again.', violations });
    }

    const claim = await this.prisma.deepPracticeEntry.updateMany({
      where: { id: entryId, status: 'PAUSED' },
      data: { status: 'SUBMITTED' },
    });
    if (claim.count === 0) throw new BadRequestException('Entry was already submitted');

    const topic = await this.prisma.deepPracticeTopic.findUniqueOrThrow({ where: { id: entry.topicId } });

    // Section A (механика) — LanguageTool, бесплатно
    const mechanicsRes = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ text: entry.text, language: 'en-US', enabledOnly: 'false' }).toString(),
      signal: AbortSignal.timeout(15_000),
    });
    const mechanics = mechanicsRes.ok
      ? (await mechanicsRes.json() as { matches: Array<{ message: string; context: { text: string } }> })
      : { matches: [] };

    // Section B/C (семантика) + Constraint Targeting — Gemini, бесплатно
    const audit = await this.gemini.runClinicalAudit(entry.text, { core: topic.core, constraint: topic.constraint });

    const cards: DeepPracticeCardEntity[] = [
      ...mechanics.matches.slice(0, 10).map((m) => ({
        id: randomUUID(), trigger: m.context.text, pattern: '(see suggested correction)',
        coreReason: m.message, category: 'mechanics', createdAt: new Date().toISOString(),
      })),
      ...audit.sectionB.map((i) => ({
        id: randomUUID(), trigger: i.trigger, pattern: i.pattern, coreReason: i.coreReason,
        category: i.category, createdAt: new Date().toISOString(),
      })),
      ...audit.sectionC.map((i) => ({
        id: randomUUID(), trigger: i.trigger, pattern: i.pattern, coreReason: i.coreReason,
        category: i.category, createdAt: new Date().toISOString(),
      })),
    ];

    await this.prisma.deepPracticeEntry.update({
      where: { id: entryId },
      data: {
        status: 'ANALYZED',
        cards,
        topicAdherenceOk: audit.topicAdherence?.onTopic ?? null,
        topicAdherenceReason: audit.topicAdherence?.reason ?? null,
      },
    });

    // Каждая карточка — в общую SRS-ленту Mistakes, единую для всего проекта
    for (const card of cards) {
      await this.mistakes.recordAttempt({
        userId,
        targetId: `${entryId}:${card.id}`,
        source: 'WRITING',
        category: this.mapCategoryToErrorCategory(card.category),
        topic: 'deep-practice',
        level: topic.level,
        isCorrect: false,
        userAnswer: card.trigger,
        correctAnswer: card.pattern,
        tags: [card.category],
      });
    }

    // Off-topic (Constraint Targeting) — не наказываем деньгами/прогрессом
    // жёстко, но честно показываем пользователю: это ключевая метрика метода.
    const onTopic = audit.topicAdherence?.onTopic ?? true;
    await this.progress.recordActivity({
      userId,
      xpEarned: onTopic ? 15 : 3,
      minutesSpent: 8,
    });

    return {
      status: 'ANALYZED',
      onTopic,
      topicAdherenceReason: audit.topicAdherence?.reason ?? null,
      cards,
    };
  }

  async getEntry(userId: string, entryId: string) {
    const entry = await this.prisma.deepPracticeEntry.findUnique({ where: { id: entryId }, include: { topic: true } });
    if (entry === null) throw new NotFoundException('Entry not found');
    if (entry.userId !== userId) throw new ForbiddenException('Access denied');
    return entry;
  }

  async getUserEntries(userId: string) {
    return this.prisma.deepPracticeEntry.findMany({
      where: { userId },
      include: { topic: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  private mapCategoryToErrorCategory(category: string): ErrorCategory {
    if (['calque', 'tautology', 'pleonasm'].includes(category)) return 'VOCABULARY';
    return 'GRAMMAR';
  }

  private async getOwnedEntry(userId: string, entryId: string, allowedStatuses: string[]) {
    const entry = await this.prisma.deepPracticeEntry.findUnique({ where: { id: entryId } });
    if (entry === null) throw new NotFoundException('Entry not found');
    if (entry.userId !== userId) throw new ForbiddenException('Access denied');
    if (!allowedStatuses.includes(entry.status)) {
      throw new BadRequestException(`Entry is in status ${entry.status}, expected one of: ${allowedStatuses.join(', ')}`);
    }
    return entry;
  }
}