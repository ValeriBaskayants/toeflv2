// backend/src/modules/tts/tts.module.ts
// НОВЫЙ ФАЙЛ — создай его рядом с tts.controller.ts и tts.service.ts

import { Module } from '@nestjs/common';
import { TtsController } from './tts.controller';
import { TtsService } from './tts.service';
import PrismaModule from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TtsController],
  providers: [TtsService],
})
export class TtsModule {}