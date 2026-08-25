import { Module } from '@nestjs/common';
import { SpeakingRepeatService } from './speaking-repeat.service';
import { SpeakingRepeatController } from './speaking-repeat.controller';
import { ProgressModule } from '../progress/progress.module';
import { AzureSpeechModule } from '../azure-speech/azure-speech.module';
import { MistakesModule } from '../mistakes/mistakes.module';

@Module({
  imports: [ProgressModule, AzureSpeechModule, MistakesModule],
  controllers: [SpeakingRepeatController],
  providers: [SpeakingRepeatService],
  exports: [SpeakingRepeatService],
})
export class SpeakingRepeatModule {}
