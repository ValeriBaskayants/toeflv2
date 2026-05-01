import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ReadingsService } from './readings.service';
import { GetReadingsDto } from './dto/get-readings.dto';
import { BulkCreateReadingsDto } from './dto/bulk-create-reading.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// Prefix 'readings' — global 'api' prefix is set in main.ts
// Full path: GET /api/readings
// @UseGuards(JwtAuthGuard) is omitted — applied globally via APP_GUARD in AppModule
@Controller('readings')
export class ReadingsController {
  constructor(private readonly service: ReadingsService) {}

  // GET /api/readings?level=A1&topic=grammar
  @Get()
  findAll(@Query() query: GetReadingsDto) {
    // FIX: was calling this.service.find() which doesn't exist
    return this.service.findMany(query);
  }

  // GET /api/readings/slug/:slug  — preferred lookup (SEO-friendly URLs)
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  // GET /api/readings/:id — fallback lookup by ObjectId
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  // POST /api/readings/bulk — admin only (TODO: add @Roles('ADMIN') guard)
  @Post('bulk')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
  bulkCreate(@Body() dto: BulkCreateReadingsDto) {
    return this.service.bulkCreate(dto.readings);
  }
}
