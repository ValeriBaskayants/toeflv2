import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ReadingsService, type SubmitResult } from './readings.service';
import { GetReadingsDto } from './dto/get-readings.dto';
import { BulkCreateReadingsDto } from './dto/bulk-create-reading.dto';
import { SubmitReadingDto } from './dto/submit-reading.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

class GetReadingsWithSearchDto extends GetReadingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

@Controller('readings')
export class ReadingsController {
  constructor(private readonly service: ReadingsService) {}

  
  
  @Get()
  findAll(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: GetReadingsWithSearchDto,
  ) {
    return this.service.findMany({
      userId: user.id,
      level:  query.level,
      topic:  query.topic,
    });
  }

  
  @Get('history')
  getHistory(@CurrentUser() user: JwtUserPayload) {
    return this.service.getUserHistory(user.id);
  }

  
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  
  @Post('submit')
  submitAnswers(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: SubmitReadingDto,
    @Query('timezone') timezone?: string,
  ): Promise<SubmitResult> {
    return this.service.submitAnswers(user.id, dto, timezone);
  }

  
  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreate(@Body() dto: BulkCreateReadingsDto) {
    return this.service.bulkCreate(dto.readings);
  }
}