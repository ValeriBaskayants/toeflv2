import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WritingService } from './writing.service';
import { WritingController } from './writing.controller';
import { WritingProcessor } from './processors/writing.processor';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'writing-analysis' }), ProgressModule],
  controllers: [WritingController],
  providers: [WritingService, WritingProcessor],
  exports: [WritingService],
})
export class WritingModule {}
