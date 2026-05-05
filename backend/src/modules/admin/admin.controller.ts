import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { 
  ImportExercisesDto, 
  ImportGrammarRulesDto, 
  ImportVocabularyDto, 
  ImportReadingsDto, 
  ImportMultipleChoiceDto, 
  ImportWritingPromptsDto, 
  ImportListeningDto 
} from './dto/import.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN') 
export class AdminController {
  constructor(private readonly service: AdminService) { }

  @Post('import/exercises')
  importExercises(@Body() body: ImportExercisesDto) {
    return this.service.importExercises(body);
  }

  @Post('import/grammar-rules')
  importGrammarRules(@Body() body: ImportGrammarRulesDto) {
    return this.service.importGrammarRules(body);
  }

  @Post('import/vocabulary')
  importVocabulary(@Body() body: ImportVocabularyDto) {
    return this.service.importVocabulary(body);
  }

  @Post('import/readings')
  importReadings(@Body() body: ImportReadingsDto) {
    return this.service.importReadings(body);
  }

  @Post('import/multiple-choice')
  importMC(@Body() body: ImportMultipleChoiceDto) {
    return this.service.importMultipleChoice(body);
  }

  @Post('import/writing-prompts')
  importWriting(@Body() body: ImportWritingPromptsDto) {
    return this.service.importWritingPrompts(body);
  }

  @Post('import/listening')
  importListening(@Body() body: ImportListeningDto) {
    return this.service.importListening(body);
  }

  @Get('stats')
  getStats(@Request() req: any) {
    return this.service.getStats(req.user.id);
  }
}