import { Module } from '@nestjs/common';
import { ReadingBandEstimateService } from './reading-band-estimate.service';
import { ReadingBandEstimateController } from './reading-band-estimate.controller';

@Module({
  controllers: [ReadingBandEstimateController],
  providers: [ReadingBandEstimateService],
  exports: [ReadingBandEstimateService],
})
export class ReadingBandEstimateModule {}