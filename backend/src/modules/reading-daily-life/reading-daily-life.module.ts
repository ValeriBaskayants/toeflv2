import { Module } from '@nestjs/common';
import { ReadingDailyLifeService } from './reading-daily-life.service';
import { ReadingDailyLifeController } from './reading-daily-life.controller';
import { ReadingCommonModule } from '../reading-common/reading-common.module';
import { BookmarksModule } from '../bookmarks/bookmarks.module';

@Module({
  imports: [ReadingCommonModule, BookmarksModule],
  controllers: [ReadingDailyLifeController],
  providers: [ReadingDailyLifeService],
  exports: [ReadingDailyLifeService],
})
export class ReadingDailyLifeModule {}