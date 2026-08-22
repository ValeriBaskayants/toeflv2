import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT_CONFIG',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        host: config.getOrThrow<string>('redis.host'),
        port: config.getOrThrow<number>('redis.port'),
      }),
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}