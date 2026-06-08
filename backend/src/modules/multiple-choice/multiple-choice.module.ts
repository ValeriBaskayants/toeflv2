import { Module as MCModule } from '@nestjs/common';
import { MultipleChoiceService } from './multiple-choice.service';
import { MultipleChoiceController } from './multiple-choice.controller';
import { ProgressModule as PMod } from '../progress/progress.module';
 
@MCModule({
  imports:     [PMod],  
  controllers: [MultipleChoiceController],
  providers:   [MultipleChoiceService],
  exports:     [MultipleChoiceService],
})
export class MultipleChoiceModule {}