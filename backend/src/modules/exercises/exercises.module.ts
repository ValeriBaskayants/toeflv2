import { Module } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { ExercisesController } from './exercises.controller';
import { ProgressModule } from '../progress/progress.module';
import PrismaModule from '../prisma/prisma.module';
import { TopicMasteryModule } from '../topic-mastery/topic-mastery.module';
import { MistakesModule } from '../mistakes/mistakes.module';

@Module({
  imports: [PrismaModule, ProgressModule,TopicMasteryModule,MistakesModule],
  controllers: [ExercisesController],
  providers: [ExercisesService],
  exports: [ExercisesService],
})
export class ExercisesModule {}
