
















import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TtsService } from './tts.service';
import { TtsRequestDto } from './dto/tts.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('listening')
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  
  
  
  
  
  @Post('tts')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  synthesize(
    
    
    @CurrentUser() _user: JwtUserPayload,
    @Body() dto: TtsRequestDto,
  ) {
    return this.ttsService.synthesize(dto.materialId, dto.text, dto.rate);
  }
}