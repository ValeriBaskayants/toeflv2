import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ReadingAcademicService } from './reading-academic.service';
import { GetAcademicPassageDto, BulkCreateAcademicPassageDto, SubmitAcademicPassageDto } from './dto/academic-passage.dto';
import { OptionalLevelQueryDto } from '../../common/dto/optional-level-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserTimezone } from '../../common/decorators/user-timezone.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('reading/academic')
export class ReadingAcademicController {
  constructor(private readonly service: ReadingAcademicService) {}

  @Get()
  findAll(@CurrentUser() user: JwtUserPayload, @Query() query: GetAcademicPassageDto) {
    return this.service.findAll(user.id, query);
  }

  @Post('toefl-mode/start')
  startToeflMode(@CurrentUser() user: JwtUserPayload, @Query() query: OptionalLevelQueryDto) {
    return this.service.startToeflModeSession(user.id, query.level);
  }

  @Post('submit')
  submitAnswers(@CurrentUser() user: JwtUserPayload, @Body() dto: SubmitAcademicPassageDto, @UserTimezone() timezone?: string) {
    return this.service.submitAnswers(user.id, dto.sessionId, dto.answers, timezone);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreate(@Body() dto: BulkCreateAcademicPassageDto) {
    return this.service.bulkCreate(dto.items);
  }

  @Post(':id/start')
  startSession(@CurrentUser() user: JwtUserPayload, @Param('id', ParseObjectIdPipe) taskId: string) {
    return this.service.startSession(user.id, taskId);
  }
}