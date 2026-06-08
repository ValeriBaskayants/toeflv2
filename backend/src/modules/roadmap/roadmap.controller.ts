import { Controller, Get } from '@nestjs/common';
import { RoadmapService } from './roadmap.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
 
@Controller('roadmap')
export class RoadmapController {
  constructor(private readonly service: RoadmapService) {}
 
  @Get()
  getRoadmap(@CurrentUser() user: JwtUserPayload) {
    return this.service.getRoadmap(user.id);
  }
}