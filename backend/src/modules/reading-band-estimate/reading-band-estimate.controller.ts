import { Controller, Get } from '@nestjs/common';
import { ReadingBandEstimateService } from './reading-band-estimate.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('reading/band-estimate')
export class ReadingBandEstimateController {
  constructor(private readonly service: ReadingBandEstimateService) {}

  @Get()
  getEstimate(@CurrentUser() user: JwtUserPayload) {
    return this.service.getEstimate(user.id);
  }
}