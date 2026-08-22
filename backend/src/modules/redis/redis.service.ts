import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

interface RedisClientConfig {
  host: string;
  port: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(@Inject('REDIS_CLIENT_CONFIG') private readonly clientConfig: RedisClientConfig) {}

  onModuleInit(): void {
    this.client = new Redis({
      host: this.clientConfig.host,
      port: this.clientConfig.port,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 200, 2000),
    });

    this.client.on('error', (err: Error) => {
      this.logger.error('REDIS_CONNECTION_ERROR', { error: err.message });
    });

    this.client.on('connect', () => {
      this.logger.log('REDIS_CONNECTED', { host: this.clientConfig.host, port: this.clientConfig.port });
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (err: unknown) {
      this.logger.warn('REDIS_GET_FAILED', { key, error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch (err: unknown) {
      this.logger.warn('REDIS_SET_FAILED', { key, error: err instanceof Error ? err.message : String(err) });
    }
  }

  async incrbyfloat(key: string, amount: number): Promise<number> {
    try {
      const result = await this.client.incrbyfloat(key, amount);
      return parseFloat(result);
    } catch (err: unknown) {
      this.logger.warn('REDIS_INCR_FAILED', { key, error: err instanceof Error ? err.message : String(err) });
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.client.expire(key, seconds);
    } catch (err: unknown) {
      this.logger.warn('REDIS_EXPIRE_FAILED', { key, error: err instanceof Error ? err.message : String(err) });
    }
  }
}