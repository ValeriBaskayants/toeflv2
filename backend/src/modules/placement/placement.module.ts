import { Module } from '@nestjs/common';
import { PlacementService } from './placement.service';

@Module({
  controllers: [],
  exports: [PlacementService],
  providers: [PlacementService],
})
export class PlacementModule {}
