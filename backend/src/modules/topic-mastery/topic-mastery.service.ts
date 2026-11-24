import { Injectable, Logger } from '@nestjs/common';
import type { Level } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { emaAccuracy } from '../../constants/level-requirements';

export type PracticeKind = 'grammar' | 'quiz' | 'reading' | 'listening' | 'scramble';

interface PracticeTargetsShape {
  grammarRequired: number;
  grammarAccuracyMin: number;
  quizRequired: number;
  readingRequired: number;
  listeningRequired: number;
  scrambleRequired: number;
}

const DEFAULT_TARGETS: PracticeTargetsShape = {
  grammarRequired: 5,
  grammarAccuracyMin: 60,
  quizRequired: 2,
  readingRequired: 1,
  listeningRequired: 1,
  scrambleRequired: 3,
};

interface RecordPracticeParams {
  userId: string;
  topicSlugs: string[];
  kind: PracticeKind;
  accuracy?: number;
}

@Injectable()
export class TopicMasteryService {
  private readonly logger = new Logger(TopicMasteryService.name);

  constructor(private readonly prisma: PrismaService) { }

  async recordPractice(params: RecordPracticeParams): Promise<void> {
    const { userId, topicSlugs, kind, accuracy } = params;
    const uniqueSlugs = [...new Set(topicSlugs)].filter((s) => s.trim().length > 0);

    if (uniqueSlugs.length === 0) {
      return;
    }

    const rules = await this.prisma.grammarRule.findMany({
      where: { slug: { in: uniqueSlugs } },
      select: { slug: true, level: true, practiceTargets: true },
    });
    const ruleMap = new Map(rules.map((r) => [r.slug, r]));

    await Promise.all(
      uniqueSlugs.map((slug) => this.upsertOne(userId, slug, ruleMap.get(slug), kind, accuracy)),
    );
  }

  private async upsertOne(
    userId: string,
    slug: string,
    rule: { level: Level; practiceTargets: unknown } | undefined,
    kind: PracticeKind,
    accuracy: number | undefined,
  ): Promise<void> {
    if (rule === undefined) {
      this.logger.warn(`TOPIC_SLUG_NOT_FOUND: "${slug}" — content references a topic that doesn't exist in the curriculum`);
      return;
    }

    const existing = await this.prisma.userTopicMastery.findUnique({
      where: { userId_topicSlug: { userId, topicSlug: slug } },
    });

    const now = new Date();

    const grammarCompleted = existing?.grammarCompleted ?? 0;
    const grammarAccuracy = existing?.grammarAccuracy ?? 0;
    const quizCompleted = existing?.quizCompleted ?? 0;
    const quizAccuracy = existing?.quizAccuracy ?? 0;
    const readingCompleted = existing?.readingCompleted ?? 0;
    const listeningCompleted = existing?.listeningCompleted ?? 0;
    const scrambleCompleted = existing?.scrambleCompleted ?? 0;
    const scrambleAccuracy = existing?.scrambleAccuracy ?? 0;

    const nextGrammarCompleted = kind === 'grammar' ? grammarCompleted + 1 : grammarCompleted;
    const nextQuizCompleted = kind === 'quiz' ? quizCompleted + 1 : quizCompleted;
    const nextReadingCompleted = kind === 'reading' ? readingCompleted + 1 : readingCompleted;
    const nextListeningCompleted = kind === 'listening' ? listeningCompleted + 1 : listeningCompleted;
    const nextScrambleCompleted = kind === 'scramble' ? scrambleCompleted + 1 : scrambleCompleted;

    const nextGrammarAccuracy =
      kind === 'grammar' && accuracy !== undefined
        ? emaAccuracy(grammarCompleted, grammarAccuracy, accuracy)
        : grammarAccuracy;

    const nextQuizAccuracy =
      kind === 'quiz' && accuracy !== undefined
        ? emaAccuracy(quizCompleted, quizAccuracy, accuracy)
        : quizAccuracy;

    const nextScrambleAccuracy =
      kind === 'scramble' && accuracy !== undefined
        ? emaAccuracy(scrambleCompleted, scrambleAccuracy, accuracy)
        : scrambleAccuracy;
        
    const TARGET_KEYS = Object.keys(DEFAULT_TARGETS) as Array<keyof PracticeTargetsShape>;

    function resolveTargets(raw: unknown): PracticeTargetsShape {
      if (typeof raw !== 'object' || raw === null) {
        return DEFAULT_TARGETS;
      }
      const source = raw as Record<string, unknown>;
      const merged = { ...DEFAULT_TARGETS };
      for (const key of TARGET_KEYS) {
        const value = source[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
          merged[key] = value;
        }
      }
      return merged;
    }

    const targets = resolveTargets(rule.practiceTargets);

    const meetsTargets =
      nextGrammarCompleted >= targets.grammarRequired &&
      nextGrammarAccuracy >= targets.grammarAccuracyMin &&
      nextQuizCompleted >= targets.quizRequired &&
      nextReadingCompleted >= targets.readingRequired &&
      nextListeningCompleted >= targets.listeningRequired &&
      nextScrambleCompleted >= targets.scrambleRequired;

    const wasMastered = existing?.status === 'MASTERED';
    const nextStatus = wasMastered ? 'MASTERED' : meetsTargets ? 'MASTERED' : 'IN_PROGRESS';
    const justMastered = !wasMastered && meetsTargets;

    await this.prisma.userTopicMastery.upsert({
      where: { userId_topicSlug: { userId, topicSlug: slug } },
      create: {
        userId,
        topicSlug: slug,
        level: rule.level,
        grammarCompleted: nextGrammarCompleted,
        grammarAccuracy: nextGrammarAccuracy,
        quizCompleted: nextQuizCompleted,
        quizAccuracy: nextQuizAccuracy,
        readingCompleted: nextReadingCompleted,
        listeningCompleted: nextListeningCompleted,
        scrambleCompleted: nextScrambleCompleted,
        scrambleAccuracy: nextScrambleAccuracy,
        status: nextStatus,
        masteredAt: justMastered ? now : null,
        lastPracticedAt: now,
      },
      update: {
        grammarCompleted: nextGrammarCompleted,
        grammarAccuracy: nextGrammarAccuracy,
        quizCompleted: nextQuizCompleted,
        quizAccuracy: nextQuizAccuracy,
        readingCompleted: nextReadingCompleted,
        listeningCompleted: nextListeningCompleted,
        scrambleCompleted: nextScrambleCompleted,
        scrambleAccuracy: nextScrambleAccuracy,
        status: nextStatus,
        ...(justMastered ? { masteredAt: now } : {}),
        lastPracticedAt: now,
      },
    });
  }

  async getMasteryMap(userId: string, slugs: string[]): Promise<Map<string, {
    grammarCompleted: number;
    grammarAccuracy: number;
    quizCompleted: number;
    quizAccuracy: number;
    readingCompleted: number;
    listeningCompleted: number;
    scrambleCompleted: number;
    scrambleAccuracy: number;
    status: string;
    masteredAt: Date | null;
    lastPracticedAt: Date | null;
  }>> {
    if (slugs.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.userTopicMastery.findMany({
      where: { userId, topicSlug: { in: slugs } },
    });

    return new Map(rows.map((r) => [r.topicSlug, r]));
  }
}