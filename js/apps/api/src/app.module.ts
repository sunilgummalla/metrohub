import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "./database";
import { GameStateModule } from "./game-state/game-state.module";
import { PlansModule } from "./plans/plans.module";
import { VendorsModule } from "./vendors/vendors.module";

@Module({
  imports: [DatabaseModule, GameStateModule, PlansModule, VendorsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
