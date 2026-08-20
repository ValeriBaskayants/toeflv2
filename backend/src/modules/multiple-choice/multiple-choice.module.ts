import { Module as MCModule } from '@nestjs/common';
import { MultipleChoiceService } from './multiple-choice.service';
import { MultipleChoiceController } from './multiple-choice.controller';
import { ProgressModule as PMod } from '../progress/progress.module';
import PrismaModule from '../prisma/prisma.module';
import { TopicMasteryModule } from '../topic-mastery/topic-mastery.module';

@MCModule({
  imports: [PMod,PrismaModule,TopicMasteryModule],
  controllers: [MultipleChoiceController],
  providers: [MultipleChoiceService],
  exports: [MultipleChoiceService],
})
export class MultipleChoiceModule {}
