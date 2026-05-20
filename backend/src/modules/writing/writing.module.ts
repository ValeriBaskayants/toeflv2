import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WritingService } from './writing.service';
import { WritingProcessor } from './processors/writing.processor';
import PrismaModule from './../prisma/prisma.module';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: 'writing-analysis' })],
  providers: [WritingService, WritingProcessor],
  exports: [WritingService],
})
export class WritingModule {}
