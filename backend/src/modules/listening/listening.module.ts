
import { Module } from '@nestjs/common';
import { ListeningService } from './listening.service';
import { ListeningController } from './listening.controller';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports:     [ProgressModule], 
  controllers: [ListeningController],
  providers:   [ListeningService],
  exports:     [ListeningService],
})
export class ListeningModule {}