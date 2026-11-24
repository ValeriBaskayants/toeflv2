import { Module } from '@nestjs/common';
import { ScrambleService } from './scramble.service';
import { ScrambleController } from './scramble.controller';
import { ProgressModule } from '../progress/progress.module';
import { MistakesModule } from '../mistakes/mistakes.module';
import { TopicMasteryModule } from '../topic-mastery/topic-mastery.module';
import { ScrambleSelectionService } from './scramble-selection.service';

@Module({
  imports: [ProgressModule, MistakesModule, TopicMasteryModule],
  controllers: [ScrambleController],
  providers: [ScrambleService, ScrambleSelectionService], 
  exports: [ScrambleService],
})
export class ScrambleModule {}