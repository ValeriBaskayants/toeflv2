import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TtsService } from './tts.service';
import { TtsRequestDto } from './dto/tts.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin/tts')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  synthesize(@Body() dto: TtsRequestDto) {
    return this.ttsService.synthesize(dto.materialId, dto.text, dto.rate, dto.lang);
  }
}