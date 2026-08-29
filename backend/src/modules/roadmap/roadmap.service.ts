import { Injectable, NotFoundException } from '@nestjs/common';
import type { Level } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LEVEL_ORDER, LEVEL_DISPLAY } from '../../constants/level-requirements';
import { CURRICULUM, type CurriculumTopic } from '../../constants/curriculum';

export type TopicNodeStatus = 'locked' | 'available' | 'in_progress' | 'mastered' | 'needs_review';
export type LevelStatus = 'completed' | 'current' | 'locked';

export interface RoadmapTopicNode {
  slug: string;
  title: string;
  order: number;
  isCore: boolean;
  status: TopicNodeStatus;
  summary: string;
  progress: {
    grammar: { completed: number; required: number; accuracy: number; accuracyMin: number };
    quiz: { completed: number; required: number };
    reading: { completed: number; required: number };
    listening: { completed: number; required: number };
  };
  resources: CurriculumTopic['resources'];
  prerequisiteSlugs: string[];
  missingPrerequisites: string[];
}

export interface RoadmapLevelSummary {
  level: Level;
  displayName: string;
  status: LevelStatus;
  topicCount: number;
  coreTopicCount: number;
}

export interface RoadmapResponse {
  currentLevel: string;
  levels: RoadmapLevelSummary[];
  currentLevelTopics: RoadmapTopicNode[];
  nextRecommendedTopicSlug: string | null;
  coreTopicsMasteredCount: number;
  coreTopicsTotalCount: number;
  curriculumReadinessPercent: number;
}

export interface TopicPracticeSource {
  type: 'grammar' | 'quiz' | 'reading' | 'scramble';
  label: string;
  totalCount: number;
  completedCount: number;
  browseUrl: string;
}

export interface TopicDetailResponse {
  slug: string;
  title: string;
  level: string;
  order: number;
  isCore: boolean;
  summary: string;
  status: TopicNodeStatus;
  prerequisiteSlugs: string[];
  missingPrerequisites: string[];
  practiceSources: TopicPracticeSource[];
  hasAnyContent: boolean;
  resources: CurriculumTopic['resources'];
  internalPageUrl: string | null;
}

const DEFAULT_TARGETS = {
  grammarRequired: 5,
  grammarAccuracyMin: 60,
  quizRequired: 2,
  readingRequired: 1,
  listeningRequired: 1,
};

type MasteryRow = {
  grammarCompleted: number;
  grammarAccuracy: number;
  quizCompleted: number;
  readingCompleted: number;
  listeningCompleted: number;
  scrambleCompleted: number;
  scrambleAccuracy: number;
  status: string;
  lastPracticedAt: Date | null;
};

@Injectable()
export class RoadmapService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoadmap(userId: string): Promise<RoadmapResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentLevel: true },
    });
    if (user === null) throw new NotFoundException('User not found');

    const currentLevelIdx = LEVEL_ORDER.indexOf(user.currentLevel);

    const levelTopicCounts = new Map<Level, { total: number; core: number }>();
    for (const level of LEVEL_ORDER) {
      const topicsAtLevel = CURRICULUM.filter((t) => t.level === level);
      levelTopicCounts.set(level, {
        total: topicsAtLevel.length,
        core: topicsAtLevel.filter((t) => t.isCore).length,
      });
    }

    const levels: RoadmapLevelSummary[] = LEVEL_ORDER.map((level, idx) => ({
      level,
      displayName: LEVEL_DISPLAY[level],
      status: idx < currentLevelIdx ? 'completed' : idx === currentLevelIdx ? 'current' : 'locked',
      topicCount: levelTopicCounts.get(level)?.total ?? 0,
      coreTopicCount: levelTopicCounts.get(level)?.core ?? 0,
    }));

    const currentLevelTopics = CURRICULUM.filter((t) => t.level === user.currentLevel).sort(
      (a, b) => a.order - b.order,
    );

    const masteryMap = await this.getMasteryMap(
      userId,
      currentLevelTopics.map((t) => t.slug),
    );

    const nodes = currentLevelTopics.map((topic) =>
      this.buildTopicNode(topic, masteryMap, currentLevelTopics),
    );

    const coreNodes = nodes.filter((n) => n.isCore);
    const coreMasteredCount = coreNodes.filter((n) => n.status === 'mastered').length;

    const nextRecommendedTopicSlug = this.pickNextRecommended(nodes);

    const curriculumReadinessPercent =
      coreNodes.length > 0 ? Math.round((coreMasteredCount / coreNodes.length) * 100) : 100;

    return {
      currentLevel: LEVEL_DISPLAY[user.currentLevel],
      levels,
      currentLevelTopics: nodes,
      nextRecommendedTopicSlug,
      coreTopicsMasteredCount: coreMasteredCount,
      coreTopicsTotalCount: coreNodes.length,
      curriculumReadinessPercent,
    };
  }

  async getTopicDetail(userId: string, slug: string): Promise<TopicDetailResponse> {
    const topic = CURRICULUM.find((t) => t.slug === slug);
    if (topic === undefined) {
      throw new NotFoundException(`Curriculum topic "${slug}" not found`);
    }

    const levelTopics = CURRICULUM.filter((t) => t.level === topic.level);
    const masteryMap = await this.getMasteryMap(
      userId,
      levelTopics.map((t) => t.slug),
    );
    const mastery = masteryMap.get(slug);

    const missingPrerequisites = topic.prerequisiteSlugs.filter((prereqSlug) => {
      const prereqMastery = masteryMap.get(prereqSlug);
      return prereqMastery === undefined || prereqMastery.status !== 'MASTERED';
    });

    const status = this.resolveTopicStatus(mastery, missingPrerequisites.length > 0);

    const [grammarRule, exerciseCount, quizCount, readingCount, scrambleCount] = await Promise.all([
      this.prisma.grammarRule.findUnique({ where: { slug }, select: { slug: true } }),
      this.prisma.exercise.count({ where: { topicSlugs: { has: slug } } }),
      this.prisma.multipleChoice.count({ where: { topicSlugs: { has: slug } } }),
      this.prisma.readingMaterial.count({ where: { grammarTopics: { has: slug } } }),
      this.prisma.scrambleExercise.count({ where: { topicSlugs: { has: slug } } }),
    ]);

    const allSources: TopicPracticeSource[] = [
      {
        type: 'grammar',
        label: 'Grammar exercises',
        totalCount: exerciseCount,
        completedCount: mastery?.grammarCompleted ?? 0,
        browseUrl: `/exercises?topicSlug=${slug}`,
      },
      {
        type: 'quiz',
        label: 'Quiz questions',
        totalCount: quizCount,
        completedCount: mastery?.quizCompleted ?? 0,
        browseUrl: `/quiz?topicSlug=${slug}`,
      },
      {
        type: 'reading',
        label: 'Reading passages',
        totalCount: readingCount,
        completedCount: mastery?.readingCompleted ?? 0,
        browseUrl: `/reading?topicSlug=${slug}`,
      },
      {
        type: 'scramble',
        label: 'Sentence-building drills',
        totalCount: scrambleCount,
        completedCount: mastery?.scrambleCompleted ?? 0,
        browseUrl: `/scramble?topicSlug=${slug}`,
      },
    ];

    const practiceSources = allSources.filter((source) => source.totalCount > 0);

    return {
      slug: topic.slug,
      title: topic.title,
      level: topic.level,
      order: topic.order,
      isCore: topic.isCore,
      summary: topic.summary,
      status,
      prerequisiteSlugs: topic.prerequisiteSlugs,
      missingPrerequisites,
      practiceSources,
      hasAnyContent: practiceSources.length > 0,
      resources: topic.resources,
      internalPageUrl: grammarRule !== null ? `/grammar/${slug}` : null,
    };
  }

  private buildTopicNode(
    topic: CurriculumTopic,
    masteryMap: Map<string, MasteryRow>,
    allTopicsAtLevel: CurriculumTopic[],
  ): RoadmapTopicNode {
    const mastery = masteryMap.get(topic.slug);
    const missingPrerequisites = topic.prerequisiteSlugs.filter((slug) => {
      const prereqMastery = masteryMap.get(slug);
      return prereqMastery === undefined || prereqMastery.status !== 'MASTERED';
    });

    const status = this.resolveTopicStatus(mastery, missingPrerequisites.length > 0);

    return {
      slug: topic.slug,
      title: topic.title,
      order: topic.order,
      isCore: topic.isCore,
      status,
      summary: topic.summary,
      progress: {
        grammar: {
          completed: mastery?.grammarCompleted ?? 0,
          required: DEFAULT_TARGETS.grammarRequired,
          accuracy: mastery?.grammarAccuracy ?? 0,
          accuracyMin: DEFAULT_TARGETS.grammarAccuracyMin,
        },
        quiz: { completed: mastery?.quizCompleted ?? 0, required: DEFAULT_TARGETS.quizRequired },
        reading: { completed: mastery?.readingCompleted ?? 0, required: DEFAULT_TARGETS.readingRequired },
        listening: { completed: mastery?.listeningCompleted ?? 0, required: DEFAULT_TARGETS.listeningRequired },
      },
      resources: topic.resources,
      prerequisiteSlugs: topic.prerequisiteSlugs,
      missingPrerequisites: missingPrerequisites
        .map((slug) => allTopicsAtLevel.find((t) => t.slug === slug)?.title)
        .filter((title): title is string => title !== undefined),
    };
  }

  private resolveTopicStatus(mastery: MasteryRow | undefined, isLocked: boolean): TopicNodeStatus {
    if (isLocked) return 'locked';
    if (mastery === undefined) return 'available';
    if (mastery.status === 'MASTERED') return 'mastered';

    const isStale =
      mastery.lastPracticedAt !== null &&
      Date.now() - mastery.lastPracticedAt.getTime() > 21 * 24 * 60 * 60 * 1000;

    return isStale ? 'needs_review' : 'in_progress';
  }

  private pickNextRecommended(nodes: RoadmapTopicNode[]): string | null {
    const inProgress = nodes.find((n) => n.status === 'in_progress');
    if (inProgress !== undefined) return inProgress.slug;

    const needsReview = nodes.find((n) => n.status === 'needs_review');
    if (needsReview !== undefined) return needsReview.slug;

    const nextAvailable = nodes.find((n) => n.status === 'available');
    return nextAvailable?.slug ?? null;
  }

  private async getMasteryMap(userId: string, slugs: string[]): Promise<Map<string, MasteryRow>> {
    if (slugs.length === 0) return new Map();

    const rows = await this.prisma.userTopicMastery.findMany({
      where: { userId, topicSlug: { in: slugs } },
    });

    return new Map(rows.map((r) => [r.topicSlug, r]));
  }
}