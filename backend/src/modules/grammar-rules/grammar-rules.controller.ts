import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { GrammarRulesService } from './grammar-rules.service';
import { GetGrammarRulesDto } from './dto/get-grammar-rules.dto';
import { BulkCreateGrammarRulesDto } from './dto/bulk-create-grammar-rule.dto';

// Full path: /api/grammar-rules (api/ prefix set globally in main.ts)
// @UseGuards(JwtAuthGuard) omitted — applied globally via APP_GUARD
@Controller('grammar-rules')
export class GrammarRulesController {
  constructor(private readonly service: GrammarRulesService) {}

  // GET /api/grammar-rules?level=A1
  @Get()
  findAll(@Query() query: GetGrammarRulesDto) {
    return this.service.findAll(query.level);
  }

  // GET /api/grammar-rules/:slug
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  // POST /api/grammar-rules/bulk — admin only (TODO: @Roles('ADMIN'))
  @Post('bulk')
  bulkCreate(@Body() dto: BulkCreateGrammarRulesDto) {
    return this.service.bulkCreate(dto.rules);
  }
}