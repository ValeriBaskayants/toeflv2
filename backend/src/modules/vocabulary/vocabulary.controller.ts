import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { VocabularyService } from './vocabulary.service';
import { GetFlashcardsDto, GetVocabularyDto } from './dto/get-vocabulary.dto';
import { ReviewWordDto } from './dto/review-word.dto';
import { BulkCreateVocabularyDto } from './dto/bulk-create-vocabulary.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly service: VocabularyService) {}

  @Get()
  findAll(@Query() query: GetVocabularyDto) {
    return this.service.findAll(query);
  }

  @Get('flashcards')
  getFlashcards(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: GetFlashcardsDto,
  ) {
    return this.service.getFlashcards(user.id, query);
  }

  @Get('user-progress')
  getUserProgress(@CurrentUser() user: JwtUserPayload) {
    return this.service.getUserProgress(user.id);
  }

  @Post('review')
  review(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: ReviewWordDto,
  ) {
    return this.service.reviewWord(user.id, dto.wordId, dto.quality);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  bulkCreate(@Body() dto: BulkCreateVocabularyDto) {
    return this.service.bulkCreate(dto.vocabulary);
  }
}