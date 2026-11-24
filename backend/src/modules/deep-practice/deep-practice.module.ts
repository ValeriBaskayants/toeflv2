import { Module } from '@nestjs/common';
import { DeepPracticeService } from './deep-practice.service';
import { DeepPracticeController } from './deep-practice.controller';
import { MistakesModule } from '../mistakes/mistakes.module';
import { ProgressModule } from '../progress/progress.module';
import { GeminiWritingModule } from '../gemini-writin/gemini-writing.module';

@Module({
  imports: [MistakesModule, ProgressModule, GeminiWritingModule],
  controllers: [DeepPracticeController],
  providers: [DeepPracticeService],
  exports: [DeepPracticeService],
})
export class DeepPracticeModule {}