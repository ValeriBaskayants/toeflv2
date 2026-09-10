import { Module } from '@nestjs/common';
import { SpeakingInterviewService } from './speaking-interview.service';
import { SpeakingInterviewController } from './speaking-interview.controller';
import { ProgressModule } from '../progress/progress.module';
import { AzureSpeechModule } from '../azure-speech/azure-speech.module';

@Module({
  imports: [ProgressModule, AzureSpeechModule],
  controllers: [SpeakingInterviewController],
  providers: [SpeakingInterviewService],
  exports: [SpeakingInterviewService],
})
export class SpeakingInterviewModule {}