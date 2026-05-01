import { Module } from '@nestjs/common';
import { MultipleChoiceService } from './multiple-choice.service';
import { MultipleChoiceController } from './multiple-choice.controller';

@Module({
  controllers: [MultipleChoiceController],
  providers: [MultipleChoiceService],
  exports: [MultipleChoiceService],
})
export class MultipleChoiceModule {}
