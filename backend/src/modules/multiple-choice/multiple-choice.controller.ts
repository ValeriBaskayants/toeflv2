import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MultipleChoiceService } from './multiple-choice.service';

@Controller('api/multiple-choice')
@UseGuards(JwtAuthGuard)
export class MultipleChoiceController {
  constructor(private service: MultipleChoiceService) {}

  @Get()
  findAll(@Query() q: any) {
    return this.service.findAll({ level: q.level, difficulty: q.difficulty, limit: +q.limit });
  }
}
