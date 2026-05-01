import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MistakesService } from './mistakes.service';

@Controller('api/mistakes')
@UseGuards(JwtAuthGuard)
export class MistakesController {
  constructor(private service: MistakesService) {}

  @Get()
  findAll(@Request() req: any, @Query('itemType') itemType: string) {
    return this.service.findAll(req.user.sub, itemType);
  }

  @Get('weak-spots')
  getWeakSpots(@Request() req: any) {
    return this.service.getWeakSpots(req.user.sub);
  }
}
