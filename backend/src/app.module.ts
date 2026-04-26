import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import PrismaModule from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProgressModule } from './modules/progress/progress.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      load:     [configuration],
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl:   config.getOrThrow<number>('throttle.ttl') * 1000,
            limit: config.getOrThrow<number>('throttle.limit'),
          },
        ],
      }),
    }),
    PrismaModule,
    AuthModule,
    ProgressModule,
  ],
  providers: [
    // ThrottlerGuard first — rate limit BEFORE auth check on every request
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // JwtAuthGuard globally — all routes protected unless @Public() is present
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}