import { Module } from '@nestjs/common';
import { ListeningService } from './listening.service';
import { ListeningController } from './listening.controller';
import { TtsService } from '../tts/tts.service';
import { TtsController } from '../tts/tts.controller';
import { ProgressModule } from '../progress/progress.module';
import { TopicMasteryModule } from '../topic-mastery/topic-mastery.module';

@Module({
  imports: [ProgressModule,TopicMasteryModule],
  controllers: [ListeningController, TtsController],
  providers: [ListeningService, TtsService],
  exports: [ListeningService],
})
export class ListeningModule {}
