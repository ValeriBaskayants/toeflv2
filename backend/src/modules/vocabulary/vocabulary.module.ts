import { Module } from '@nestjs/common';
import { VocabularyService } from './vocabulary.service';
import { VocabularyController } from './vocabulary.controller';
import PrismaModule from '../prisma/prisma.module';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports:[PrismaModule,ProgressModule],
  controllers: [VocabularyController],
  providers: [VocabularyService],
  exports: [VocabularyService],
})
export class VocabularyModule {}
