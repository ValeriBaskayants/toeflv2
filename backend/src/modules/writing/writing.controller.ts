import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { WritingService } from './writing.service';
import { GetPromptsDto } from './dto/get-prompts.dto';
import { SubmitWritingDto } from './dto/submit-writing.dto';
import { BulkCreatePromptsDto } from './dto/bulk-create-prompts.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

class GetSubmissionsDto {
  @IsOptional()
  @IsString()
  promptId?: string;
}

@Controller('writing')
export class WritingController {
  constructor(private readonly service: WritingService) {}

  @Get('prompts')
  getPrompts(@Query() query: GetPromptsDto) {
    return this.service.getPrompts(query.level);
  }

  @Get('prompts/:id')
  getPrompt(@Param('id') id: string) {
    return this.service.getPromptById(id);
  }

  @Post('submit')
  submit(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: SubmitWritingDto,
  ) {
    return this.service.submit(user.id, dto.promptId, dto.text);
  }

  @Get('submissions')
  getSubmissions(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: GetSubmissionsDto,
  ) {
    return this.service.getSubmissions(user.id, query.promptId);
  }

  @Get('submissions/:id')
  getSubmission(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') id: string,
  ) {
    return this.service.getSubmission(id, user.id);
  }

  @Post('prompts/bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreatePrompts(@Body() dto: BulkCreatePromptsDto) {
    return this.service.bulkCreatePrompts(dto.prompts);
  }
}