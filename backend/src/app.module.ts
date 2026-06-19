import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import PrismaModule from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProgressModule } from './modules/progress/progress.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

import { ExercisesModule } from './modules/exercises/exercises.module';
import { GrammarRulesModule } from './modules/grammar-rules/grammar-rules.module';
import { ReadingsModule } from './modules/readings/readings.module';
import { VocabularyModule } from './modules/vocabulary/vocabulary.module';
import { WritingModule } from './modules/writing/writing.module';
import { ListeningModule } from './modules/listening/listening.module';
import { MultipleChoiceModule } from './modules/multiple-choice/multiple-choice.module';
import { MistakeModule } from './modules/mistakes/mistakes.module';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
import { AdminModule } from './modules/admin/admin.module';
import { PlacementModule } from './modules/placement/placement.module';
import { BullModule } from '@nestjs/bullmq';
import { RoadmapModule } from './modules/roadmap/roadmap.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('redis.host'),
          port: config.getOrThrow<number>('redis.port'),
        },
      }),
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
    PrismaModule,
    AuthModule,
    AdminModule,
    ProgressModule,
    ExercisesModule,
    GrammarRulesModule,
    ReadingsModule,
    VocabularyModule,
    WritingModule,
    ListeningModule,
    MultipleChoiceModule,
    MistakeModule,
    BookmarksModule,
    PlacementModule,
    RoadmapModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
