import { Module } from "@nestjs/common";
import { MistakesService } from "./mistakes.service";
import { MistakeController } from "./mistakes.controller";

@Module({
  controllers: [MistakeController],
  providers: [MistakesService],
  exports: [MistakesService]
})

export class MistakeModule{}