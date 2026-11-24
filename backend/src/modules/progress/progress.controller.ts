import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ProgressService, type DashboardResponse } from './progress.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserTimezone } from '../../common/decorators/user-timezone.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: JwtUserPayload, @UserTimezone() timezone?: string): Promise<DashboardResponse> {
    return this.progressService.getDashboard(user.id, timezone);
  }

  @Post('level-up')
  @HttpCode(HttpStatus.OK)
  levelUp(@CurrentUser() user: JwtUserPayload) {
    return this.progressService.levelUp(user.id);
  }
}