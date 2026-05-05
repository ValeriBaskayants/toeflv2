import { Injectable } from '@nestjs/common';
import { ExercisesService } from '../exercises/exercises.service';
import { GrammarRulesService } from '../grammar-rules/grammar-rules.service';
import { VocabularyService } from '../vocabulary/vocabulary.service';
import { ReadingsService } from '../readings/readings.service';
import { MultipleChoiceService } from '../multiple-choice/multiple-choice.service';
import { WritingService } from '../writing/writing.service';
import { ListeningService } from '../listening/listening.service';
import { PrismaService } from '../prisma/prisma.service';
import { 
  ImportExercisesDto, 
  ImportGrammarRulesDto, 
  ImportVocabularyDto, 
  ImportReadingsDto, 
  ImportMultipleChoiceDto, 
  ImportWritingPromptsDto, 
  ImportListeningDto 
} from './dto/import.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exercisesService: ExercisesService,
    private readonly grammarRulesService: GrammarRulesService,
    private readonly vocabularyService: VocabularyService,
    private readonly readingsService: ReadingsService,
    private readonly mcService: MultipleChoiceService,
    private readonly writingService: WritingService,
    private readonly listeningService: ListeningService,
  ) { }

  async importExercises(data: ImportExercisesDto) {
    return this.exercisesService.bulkCreate(data.exercises);
  }

  async importGrammarRules(data: ImportGrammarRulesDto) {
    return this.grammarRulesService.bulkCreate(data.grammarRules);
  }

  async importVocabulary(data: ImportVocabularyDto) {
    return this.vocabularyService.bulkCreate(data.vocabulary);
  }

  async importReadings(data: ImportReadingsDto) {
    return this.readingsService.bulkCreate(data.readings);
  }

  async importMultipleChoice(data: ImportMultipleChoiceDto) {
    return this.mcService.bulkCreate(data.multipleChoice);
  }

  async importWritingPrompts(data: ImportWritingPromptsDto) {
    return this.writingService.bulkCreatePrompts(data.writingPrompts);
  }

  async importListening(data: ImportListeningDto) {
    return this.listeningService.bulkCreate(data.listening);
  }

  async getStats(adminId: string) {
    const totalUsers = await this.prisma.user.count();
    
    const adminData = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, role: true } // Не возвращаем пароль
    });

    return {
      adminInfo: adminData,
      platformStats: {
        totalUsers,
      }
    };
  }
}