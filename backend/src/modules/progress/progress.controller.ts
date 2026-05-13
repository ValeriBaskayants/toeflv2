import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ProgressService, type DashboardResponse } from './progress.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
 
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}
 
  @Get('dashboard')
  getDashboard(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<DashboardResponse> {
    return this.progressService.getDashboard(user.id);
  }
 
  @Get('level')
  getLevelProgress(@CurrentUser() user: JwtUserPayload) {
    return this.progressService.getLevelProgress(user.id);
  }
 
  @Post('level-up')
  @HttpCode(HttpStatus.OK)
  levelUp(@CurrentUser() user: JwtUserPayload) {
    return this.progressService.levelUp(user.id);
  }
}