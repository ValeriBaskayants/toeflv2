import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import PrismaModule from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProgressModule } from './modules/progress/progress.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { GrammarRulesModule } from './modules/grammar-rules/grammar-rules.module';
import { MultipleChoiceModule } from './modules/multiple-choice/multiple-choice.module';
import { ReadingsModule } from './modules/readings/readings.module';
import { VocabularyModule } from './modules/vocabulary/vocabulary.module';
import { WritingModule } from './modules/writing/writing.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { BullModule } from '@nestjs/bull';
import { ListeningModule } from './modules/listening/listening.module';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
import { MistakeModule } from './modules/mistakes/mistakes.module';
import { AdminModule } from './modules/admin/admin.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.getOrThrow<number>('throttle.ttl') * 1000,
            limit: config.getOrThrow<number>('throttle.limit'),
          },
        ],
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.getOrThrow<string>('redis.host'), 
          port: configService.getOrThrow<number>('redis.port'), 
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    ProgressModule,
    ExercisesModule,
    GrammarRulesModule,
    MultipleChoiceModule,
    ReadingsModule,
    VocabularyModule,
    WritingModule,
    AdminModule,
    MultipleChoiceModule,
    ListeningModule,
    BookmarksModule,
    MistakeModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule { }