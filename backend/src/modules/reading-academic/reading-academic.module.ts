import { Module } from '@nestjs/common';
import { ReadingAcademicService } from './reading-academic.service';
import { ReadingAcademicController } from './reading-academic.controller';
import { ReadingCommonModule } from '../reading-common/reading-common.module';
import { BookmarksModule } from '../bookmarks/bookmarks.module';

@Module({
  imports: [ReadingCommonModule, BookmarksModule],
  controllers: [ReadingAcademicController],
  providers: [ReadingAcademicService],
  exports: [ReadingAcademicService],
})
export class ReadingAcademicModule {}