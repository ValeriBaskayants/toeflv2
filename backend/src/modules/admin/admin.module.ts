import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ExercisesModule } from '../exercises/exercises.module';
import { GrammarRulesModule } from '../grammar-rules/grammar-rules.module';
import { VocabularyModule } from '../vocabulary/vocabulary.module';
import { ReadingsModule } from '../readings/readings.module';
import { MultipleChoiceModule } from '../multiple-choice/multiple-choice.module';
import { WritingModule } from '../writing/writing.module';
import { ListeningModule } from '../listening/listening.module';

@Module({
  imports: [
    ExercisesModule, GrammarRulesModule, VocabularyModule,
    ReadingsModule, MultipleChoiceModule, WritingModule, ListeningModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
