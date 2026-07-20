import { Module } from '@nestjs/common';
import { TopicMasteryService } from './topic-mastery.service';

@Module({
  providers: [TopicMasteryService],
  exports:   [TopicMasteryService],
})
export class TopicMasteryModule {}