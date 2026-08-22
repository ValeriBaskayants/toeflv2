import { Module } from '@nestjs/common';
import { AzureSpeechService } from './azure-speech.service';

@Module({
  providers: [AzureSpeechService],
  exports: [AzureSpeechService],
})
export class AzureSpeechModule {}