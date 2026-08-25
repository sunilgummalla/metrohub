import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "./database";
import { EventsModule } from "./events/events.module";
import { GameStateModule } from "./game-state/game-state.module";
import { HomeModule } from "./home/home.module";
import { MembersModule } from "./members/members.module";
import { PlansModule } from "./plans/plans.module";
import { SeedModule } from "./seed/seed.module";
import { VendorsModule } from "./vendors/vendors.module";

@Module({
  imports: [DatabaseModule, GameStateModule, PlansModule, VendorsModule, MembersModule, HomeModule, EventsModule, SeedModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
