import { Module } from '@nestjs/common';
import { AzureSpeechService } from '../azure-speech/azure-speech.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [AzureSpeechService],
  exports: [AzureSpeechService],
})
export class AzureSpeechModule {}