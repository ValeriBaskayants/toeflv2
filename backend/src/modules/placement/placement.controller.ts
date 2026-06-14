import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { PlacementService } from './placement.service';
import { AnswerPlacementDto } from './dto/placement.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';





@Controller('placement')
export class PlacementController {
  constructor(private readonly placementService: PlacementService) {}

  
  
  
  @Get('status')
  getStatus(@CurrentUser() user: JwtUserPayload) {
    return this.placementService.getStatus(user.id);
  }

  
  
  
  @Post('start')
  @HttpCode(HttpStatus.OK)
  start(@CurrentUser() user: JwtUserPayload) {
    return this.placementService.start(user.id);
  }

  
  
  
  @Post('answer')
  @HttpCode(HttpStatus.OK)
  answer(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: AnswerPlacementDto,
  ) {
    return this.placementService.answer(user.id, dto);
  }

  
  
  @Post('skip')
  @HttpCode(HttpStatus.OK)
  skip(@CurrentUser() user: JwtUserPayload) {
    return this.placementService.skip(user.id);
  }

  
  
  @Post('remind-later')
  @HttpCode(HttpStatus.OK)
  remindLater(@CurrentUser() user: JwtUserPayload) {
    return this.placementService.remindLater(user.id);
  }
}