import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { GrammarRulesService } from './grammar-rules.service';
import { GetGrammarRulesDto } from './dto/get-grammar-rules.dto';
import { BulkCreateGrammarRulesDto } from './dto/bulk-create-grammar-rule.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
 
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
 
  // POST /api/grammar-rules/bulk — ADMIN only
  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreate(@Body() dto: BulkCreateGrammarRulesDto) {
    return this.service.bulkCreate(dto.rules);
  }
}