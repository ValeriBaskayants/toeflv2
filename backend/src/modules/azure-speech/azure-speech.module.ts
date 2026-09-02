import { Module } from '@nestjs/common';
import { AzureSpeechService } from './azure-speech.service';
import { RedisModule } from '../redis/redis.module'; // ⚠️ проверь актуальный путь/имя

@Module({
  imports: [RedisModule],
  providers: [AzureSpeechService],
  exports: [AzureSpeechService],
})
export class AzureSpeechModule {}