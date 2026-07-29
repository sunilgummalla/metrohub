import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { GameStateModule } from "./game-state/game-state.module";

@Module({
  imports: [GameStateModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
