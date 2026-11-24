import { Module } from '@nestjs/common';
import { ReadingCompleteWordsService } from './reading-complete-words.service';
import { ReadingCompleteWordsController } from './reading-complete-words.controller';
import { ReadingCommonModule } from '../reading-common/reading-common.module';
import { BookmarksModule } from '../bookmarks/bookmarks.module';

@Module({
  imports: [ReadingCommonModule, BookmarksModule],
  controllers: [ReadingCompleteWordsController],
  providers: [ReadingCompleteWordsService],
  exports: [ReadingCompleteWordsService],
})
export class ReadingCompleteWordsModule {}