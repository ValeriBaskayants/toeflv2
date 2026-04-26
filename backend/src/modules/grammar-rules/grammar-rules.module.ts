import { Module } from '@nestjs/common';
import { GrammarRulesService } from './grammar-rules.service';
import { GrammarRulesController } from './grammar-rules.controller';

@Module({
  controllers: [GrammarRulesController],
  providers: [GrammarRulesService],
  exports: [GrammarRulesService],
})
export class GrammarRulesModule {}
