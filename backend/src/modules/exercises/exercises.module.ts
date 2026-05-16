// C:\Users\valer\OneDrive\Рабочий стол\React Projects\testingAnyFrameworkOrPet\toefl\backend\src\modules\exercises\exercises.module.ts

import { Module } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { ExercisesController } from './exercises.controller';
import { ProgressModule } from '../progress/progress.module';
import PrismaModule from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,    
    ProgressModule,  
  ],
  controllers: [ExercisesController],
  providers: [ExercisesService],
  exports: [ExercisesService],
})
export class ExercisesModule {}