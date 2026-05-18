import { Module } from "@nestjs/common";
import { PlacementService } from "./Placement.service";

@Module({
    controllers: [],
    exports: [PlacementService],
    providers: [PlacementService],
})
export class PlacementModule {}