import { Module } from '@nestjs/common';
import { ScrambleController } from './scramble.controller';
import { ScrambleService } from './scramble.service';
import PrismaModule from '../prisma/prisma.module';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [PrismaModule, ProgressModule],
  controllers: [ScrambleController],
  providers: [ScrambleService],
})
export class ScrambleModule {}