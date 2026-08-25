import { Module } from '@nestjs/common';
import { ScrambleService } from './scramble.service';
import { ScrambleController } from './scramble.controller';
import { ProgressModule } from '../progress/progress.module';
import { MistakesModule } from '../mistakes/mistakes.module';

@Module({
  imports: [ProgressModule, MistakesModule],
  controllers: [ScrambleController],
  providers: [ScrambleService],
  exports: [ScrambleService],
})
export class ScrambleModule {}
