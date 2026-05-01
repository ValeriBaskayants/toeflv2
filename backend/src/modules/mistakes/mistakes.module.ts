import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Mistake, MistakeSchema } from './schemas/mistake.schema';
import { MistakesService } from './mistakes.service';
import { MistakesController } from './mistakes.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Mistake.name, schema: MistakeSchema }])],
  controllers: [MistakesController],
  providers: [MistakesService],
  exports: [MistakesService],
})
export class MistakesModule {}
