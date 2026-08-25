import { Module } from '@nestjs/common';
import { PlacementService } from './placement.service';
import { PlacementController } from './placement.controller';
import { AzureSpeechModule } from '../azure-speech/azure-speech.module';

@Module({
  imports: [AzureSpeechModule],
  controllers: [PlacementController],
  providers: [PlacementService],
})
export class PlacementModule {}
