import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ProgressService, type DashboardResponse } from './progress.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  // GET /progress/dashboard
  // Returns everything the dashboard page needs in one call:
  // level, XP, streak, skill stats, recent activity, readiness %
  @Get('dashboard')
  getDashboard(@CurrentUser() user: JwtUserPayload): Promise<DashboardResponse> {
    return this.progressService.getDashboard(user.id);
  }

  // POST /progress/level-up
  // Called by the frontend after the user passes the level test.
  // The actual test scoring logic lives in the future TestModule.
  @Post('level-up')
  @HttpCode(HttpStatus.OK)
  levelUp(@CurrentUser() user: JwtUserPayload) {
    return this.progressService.levelUp(user.id);
  }
}