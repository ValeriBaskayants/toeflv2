import { Module } from '@nestjs/common';
import { MultipleChoiceService } from './multiple-choice.service';
import { MultipleChoiceController } from './multiple-choice.controller';
import { ProgressModule } from '../progress/progress.module';
import PrismaModule from '../prisma/prisma.module';

@Module({
  imports:[ProgressModule,PrismaModule],
  controllers: [MultipleChoiceController],
  providers: [MultipleChoiceService],
  exports: [MultipleChoiceService],
})
export class MultipleChoiceModule {}
