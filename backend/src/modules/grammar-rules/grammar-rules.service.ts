import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateGrammarRuleDto } from './dto/bulk-create-grammar-rule.dto';






const LIST_SELECT = {
  id:            true,
  topic:         true,
  slug:          true,
  level:         true,
  summary:       true,
  signalWords:   true,
  relatedTopics: true,
  createdAt:     true,
} satisfies Prisma.GrammarRuleSelect;





export interface GrammarRuleListItem {
  id:            string;
  topic:         string;
  slug:          string;
  level:         Level;
  summary:       string;
  signalWords:   string[];
  relatedTopics: string[];
  createdAt:     Date;
  
  exerciseCount: number;    
  userStatus:   'not_started' | 'in_progress' | 'mastered'; 
}

export interface GrammarRuleDetail {
  rule:            Prisma.GrammarRuleGetPayload<{ select: { [K in keyof Prisma.GrammarRuleSelect]: true } }>;
  relatedExercises: Array<{
    id:         string;
    sentence:   string;
    difficulty: string;
    topic:      string;
  }>;
  userAccuracy:  number | null;   
  bookmarked:    boolean;
}





@Injectable()
export class GrammarRulesService {
  constructor(private readonly prisma: PrismaService) {}

  
  
  
  
  
  
  
  
  
  
  
  
  

  async findAll(params: {
    userId:  string;
    level?:  Level;
    search?: string;
  }): Promise<GrammarRuleListItem[]> {
    const where: Prisma.GrammarRuleWhereInput = {};
    if (params.level !== undefined)  where.level  = params.level;
    if (params.search !== undefined) {
      where.topic = { contains: params.search, mode: 'insensitive' };
    }

    
    const rules = await this.prisma.grammarRule.findMany({
      where,
      select: LIST_SELECT,
      orderBy: { topic: 'asc' },
    });

    if (rules.length === 0) return [];

    const topics = rules.map((r) => r.topic);

    
    
    
    const [exerciseCounts, userMistakes] = await Promise.all([
      
      this.prisma.exercise.groupBy({
        by:    ['topic'],
        where: { topic: { in: topics } },
        _count: { _all: true },
      }),
      
      this.prisma.userMistake.findMany({
        where: {
          userId:   params.userId,
          topic:    { in: topics },
          source:   'QUIZ',
        },
        select: {
          topic:       true,
          wrongCount:  true,
          correctCount: true,
          status:      true,
        },
      }),
    ]);

    
    const exerciseCountByTopic = new Map(
      exerciseCounts.map((g) => [g.topic, g._count._all]),
    );
    const mistakeByTopic = new Map(
      userMistakes.map((m) => [m.topic, m]),
    );

    
    const enriched: GrammarRuleListItem[] = rules.map((rule) => {
      const exerciseCount = exerciseCountByTopic.get(rule.topic) ?? 0;
      const mistake       = mistakeByTopic.get(rule.topic);

      
      let userStatus: GrammarRuleListItem['userStatus'] = 'not_started';
      if (mistake !== undefined) {
        if (mistake.status === 'MASTERED') {
          userStatus = 'mastered';
        } else {
          userStatus = 'in_progress';
        }
      }

      return {
        ...rule,
        exerciseCount,
        userStatus,
      };
    });

    
    
    const ORDER: Record<GrammarRuleListItem['userStatus'], number> = {
      in_progress: 0,
      not_started: 1,
      mastered:    2,
    };

    return enriched.sort((a, b) => ORDER[a.userStatus] - ORDER[b.userStatus]);
  }

  
  
  
  
  
  

  async findBySlug(slug: string, userId: string): Promise<GrammarRuleDetail> {
    if (slug.trim().length === 0) {
      throw new BadRequestException('Slug cannot be empty');
    }

    const rule = await this.prisma.grammarRule.findUnique({ where: { slug } });

    if (rule === null) {
      throw new NotFoundException(`Grammar rule "${slug}" not found`);
    }

    
    const [relatedExercises, userMistake, bookmark] = await Promise.all([
      
      this.prisma.exercise.findMany({
        where:   { topic: rule.topic, level: rule.level },
        select:  { id: true, sentence: true, difficulty: true, topic: true },
        orderBy: { difficulty: 'asc' },
        take:    5,
      }),
      
      this.prisma.userMistake.findFirst({
        where:  { userId, topic: rule.topic },
        select: { wrongCount: true, correctCount: true, status: true },
      }),
      
      this.prisma.bookmark.findUnique({
        where: { userId_targetId_type: {
          userId,
          targetId: rule.id,
          type: 'GRAMMAR_RULE',
        }},
        select: { id: true },
      }),
    ]);

    
    let userAccuracy: number | null = null;
    if (userMistake !== null) {
      const total = userMistake.wrongCount + userMistake.correctCount;
      userAccuracy = total > 0
        ? Math.round((userMistake.correctCount / total) * 100)
        : null;
    }

    return {
      rule,
      relatedExercises,
      userAccuracy,
      bookmarked: bookmark !== null,
    };
  }

  
  
  

  async getTopicsForLevel(level: Level): Promise<Array<{
    slug:          string;
    topic:         string;
    summary:       string;
    exerciseCount: number;
  }>> {
    const rules = await this.prisma.grammarRule.findMany({
      where:   { level },
      select:  { slug: true, topic: true, summary: true },
      orderBy: { topic: 'asc' },
    });

    if (rules.length === 0) return [];

    const topics = rules.map((r) => r.topic);
    const counts = await this.prisma.exercise.groupBy({
      by:    ['topic'],
      where: { topic: { in: topics } },
      _count: { _all: true },
    });

    const countMap = new Map(counts.map((c) => [c.topic, c._count._all]));

    return rules.map((r) => ({
      ...r,
      exerciseCount: countMap.get(r.topic) ?? 0,
    }));
  }

  

  async bulkCreate(rules: CreateGrammarRuleDto[]): Promise<{
    totalProcessed: number;
    inserted:       number;
    skipped:        number;
  }> {
    if (rules.length === 0) {
      return { totalProcessed: 0, inserted: 0, skipped: 0 };
    }

    const slugs    = rules.map((r) => r.slug);
    const existing = await this.prisma.grammarRule.findMany({
      where:  { slug: { in: slugs } },
      select: { slug: true },
    });

    const existingSlugs = new Set(existing.map((r) => r.slug));
    const toInsert      = rules.filter((r) => !existingSlugs.has(r.slug));

    if (toInsert.length > 0) {
      await this.prisma.grammarRule.createMany({ data: toInsert });
    }

    return {
      totalProcessed: rules.length,
      inserted:       toInsert.length,
      skipped:        existing.length,
    };
  }
}