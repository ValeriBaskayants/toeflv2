import { Module } from '@nestjs/common';
import { ReadingCompletionService } from './reading-completion.service';
import { ProgressModule } from '../progress/progress.module';
import { MistakesModule } from '../mistakes/mistakes.module';
import { TopicMasteryModule } from '../topic-mastery/topic-mastery.module';

@Module({
  imports: [ProgressModule, MistakesModule, TopicMasteryModule],
  providers: [ReadingCompletionService],
  exports: [ReadingCompletionService],
})
export class ReadingCommonModule {}