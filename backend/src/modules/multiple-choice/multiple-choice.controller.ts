import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { MultipleChoiceService } from './multiple-choice.service';
import { GetMultipleChoiceDto } from './dto/get-multiple-choice.dto';
import { BulkCreateMultipleChoiceDto } from './dto/bulk-create-multiple-choice.dto';
import { SubmitMCSessionDto } from './dto/submit-session.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { IsOptional, IsString } from 'class-validator';

class TimezoneDto {
  @IsOptional()
  @IsString()
  timezone?: string;
}

@Controller('multiple-choice')
export class MultipleChoiceController {
  constructor(private readonly service: MultipleChoiceService) {}

  @Get()
  findAll(@Query() query: GetMultipleChoiceDto) {
    return this.service.findAll(query);
  }

  @Post('submit')
  submitSession(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: SubmitMCSessionDto,
    @Query() query: TimezoneDto,
  ) {
    return this.service.submitSession(user.id, dto, query.timezone);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreate(@Body() dto: BulkCreateMultipleChoiceDto) {
    return this.service.bulkCreate(dto.items);
  }
}