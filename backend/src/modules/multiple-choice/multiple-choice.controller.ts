import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { MultipleChoiceService } from './multiple-choice.service';
import { GetMultipleChoiceDto } from './dto/get-multiple-choice.dto';
import { BulkCreateMultipleChoiceDto } from './dto/bulk-create-multiple-choice.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('multiple-choice')
export class MultipleChoiceController {
  constructor(private readonly service: MultipleChoiceService) {}

  @Get()
  findAll(@Query() query: GetMultipleChoiceDto) {
    return this.service.findAll(query);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreate(@Body() dto: BulkCreateMultipleChoiceDto) {
    return this.service.bulkCreate(dto.items);
  }
}