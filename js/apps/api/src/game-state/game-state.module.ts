import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database";
import { GameStateController } from "./game-state.controller";
import { GameStateService } from "./game-state.service";

@Module({
  imports: [DatabaseModule],
  controllers: [GameStateController],
  providers: [GameStateService],
})
export class GameStateModule {}
