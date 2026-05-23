import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { PlacementService } from './placement.service';
import { AnswerPlacementDto } from './dto/placement.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';

// Full path: /api/placement
// JwtAuthGuard applied globally via APP_GUARD in AppModule
@Controller('placement')
export class PlacementController {
  constructor(private readonly placementService: PlacementService) {}

  // GET /api/placement/status
  // Возвращает текущий статус теста и флаг showBanner
  // Вызывается при загрузке приложения, чтобы показать/скрыть баннер
  @Get('status')
  getStatus(@CurrentUser() user: JwtUserPayload) {
    if (!user?.id) {
      throw new BadRequestException('User ID is required');
    }
    return this.placementService.getStatus(user.id);
  }

  // POST /api/placement/start
  // Инициирует тест: сбрасывает theta, генерирует первый вопрос
  // Если тест уже COMPLETED — кидает 400
  @Post('start')
  @HttpCode(HttpStatus.OK)
  start(@CurrentUser() user: JwtUserPayload) {
    if (!user?.id) {
      throw new BadRequestException('User ID is required');
    }
    return this.placementService.start(user.id);
  }

  // POST /api/placement/answer
  // Принимает ответ на вопрос, обновляет theta, возвращает следующий вопрос
  // Если converged === true — тест завершён, возвращает detectedLevel
  @Post('answer')
  @HttpCode(HttpStatus.OK)
  answer(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: AnswerPlacementDto,
  ) {
    if (!user?.id) {
      throw new BadRequestException('User ID is required');
    }
    return this.placementService.answer(user.id, dto);
  }

  // POST /api/placement/skip
  // Пользователь пропускает тест — назначается A1
  @Post('skip')
  @HttpCode(HttpStatus.OK)
  skip(@CurrentUser() user: JwtUserPayload) {
    if (!user?.id) {
      throw new BadRequestException('User ID is required');
    }
    return this.placementService.skip(user.id);
  }

  // POST /api/placement/remind-later
  // Откладывает показ баннера на 4 дня
  @Post('remind-later')
  @HttpCode(HttpStatus.OK)
  remindLater(@CurrentUser() user: JwtUserPayload) {
    if (!user?.id) {
      throw new BadRequestException('User ID is required');
    }
    return this.placementService.remindLater(user.id);
  }
}