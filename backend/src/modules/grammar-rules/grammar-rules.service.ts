import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateGrammarRuleDto } from './dto/bulk-create-grammar-rule.dto';

// List view: omit heavy embedded arrays (usages, sections, comparisons)
// They're only needed on the detail page
const LIST_SELECT = {
  id:           true,
  topic:        true,
  slug:         true,
  level:        true,
  summary:      true,
  signalWords:  true,
  relatedTopics: true,
  createdAt:    true,
} satisfies Prisma.GrammarRuleSelect;

@Injectable()
export class GrammarRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(level?: Level) {
    return this.prisma.grammarRule.findMany({
      where:   level !== undefined ? { level } : undefined,
      select:  LIST_SELECT,
      orderBy: { topic: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    if (slug.trim().length === 0) {
      throw new BadRequestException('Slug cannot be empty');
    }

    const rule = await this.prisma.grammarRule.findUnique({
      where: { slug },
    });

    if (rule === null) {
      throw new NotFoundException(`Grammar rule with slug "${slug}" not found`);
    }

    return rule;
  }

  // ── bulkCreate ─────────────────────────────────────────────────────────────
  // FIX: was returning `errors: 0` hardcoded — now returns accurate counts.
  // FIX: was accepting `any[]` — now uses typed CreateGrammarRuleDto[].

  async bulkCreate(rules: CreateGrammarRuleDto[]): Promise<{
    totalProcessed: number;
    inserted:       number;
    skipped:        number;
  }> {
    if (rules.length === 0) {
      return { totalProcessed: 0, inserted: 0, skipped: 0 };
    }

    const slugs = rules.map((r) => r.slug);

    const existing = await this.prisma.grammarRule.findMany({
      where:  { slug: { in: slugs } },
      select: { slug: true },
    });

    const existingSlugs = new Set(existing.map((r) => r.slug));
    const toInsert = rules.filter((r) => !existingSlugs.has(r.slug));

    
    if (toInsert.length > 0) {
      await this.prisma.grammarRule.createMany({
        data:           toInsert,
      });
    }

    return {
      totalProcessed: rules.length,
      inserted:       toInsert.length,
      skipped:        existing.length,
    };
  }
}