import { Module } from '@nestjs/common';
import { GeminiWritingService } from './gemini-writing.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [GeminiWritingService],
  exports: [GeminiWritingService],
})
export class GeminiWritingModule {}