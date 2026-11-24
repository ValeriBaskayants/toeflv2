import { Module } from '@nestjs/common';
import { TtsController } from './tts.controller';
import { TtsService } from './tts.service';
import PrismaModule from '../prisma/prisma.module';
import { AzureSpeechModule } from '../azure-speech/azure-speech.module';

@Module({
  imports: [AzureSpeechModule],
  controllers: [TtsController],
  providers: [TtsService],
})
export class TtsModule {}