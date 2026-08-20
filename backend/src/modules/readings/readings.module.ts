import { Module } from '@nestjs/common';
import { ReadingsService } from './readings.service';
import { ReadingsController } from './readings.controller';
import PrismaModule from '../prisma/prisma.module';
import { ProgressModule } from '../progress/progress.module';
import { TopicMasteryModule } from '../topic-mastery/topic-mastery.module';

@Module({
  imports: [PrismaModule, ProgressModule,TopicMasteryModule],
  controllers: [ReadingsController],
  providers: [ReadingsService],
  exports: [ReadingsService],
})
export class ReadingsModule {}
