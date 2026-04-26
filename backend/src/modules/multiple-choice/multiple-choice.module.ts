import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MultipleChoice, MultipleChoiceSchema } from './schemas/multiple-choice.schema';
import { MultipleChoiceService } from './multiple-choice.service';
import { MultipleChoiceController } from './multiple-choice.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: MultipleChoice.name, schema: MultipleChoiceSchema }])],
  controllers: [MultipleChoiceController],
  providers: [MultipleChoiceService],
  exports: [MultipleChoiceService],
})
export class MultipleChoiceModule {}
