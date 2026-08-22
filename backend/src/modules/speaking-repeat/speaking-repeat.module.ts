// backend/src/modules/speaking-repeat/speaking-repeat.module.ts
import { Module } from '@nestjs/common';
import { SpeakingRepeatController } from './speaking-repeat.controller';
import { SpeakingRepeatService } from './speaking-repeat.service';
import { AzureSpeechModule } from '../azure-speech/azure-speech.module';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [AzureSpeechModule, ProgressModule],
  controllers: [SpeakingRepeatController],
  providers: [SpeakingRepeatService],
})
export class SpeakingRepeatModule {}