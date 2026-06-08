import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { GrammarRulesService } from './grammar-rules.service';
import { GetGrammarRulesDto } from './dto/get-grammar-rules.dto';
import { BulkCreateGrammarRulesDto } from './dto/bulk-create-grammar-rule.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';


class GetGrammarRulesWithSearchDto extends GetGrammarRulesDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

@Controller('grammar-rules')
export class GrammarRulesController {
  constructor(private readonly service: GrammarRulesService) {}

  
  
  @Get()
  findAll(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: GetGrammarRulesWithSearchDto,
  ) {
    return this.service.findAll({
      userId: user.id,
      level:  query.level,
      search: query.search,
    });
  }

  
  
  @Get(':slug')
  findBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.service.findBySlug(slug, user.id);
  }

  
  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreate(@Body() dto: BulkCreateGrammarRulesDto) {
    return this.service.bulkCreate(dto.rules);
  }
}