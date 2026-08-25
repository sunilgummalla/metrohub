import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database";
import { MembersController } from "./members.controller";
import { MembersService } from "./members.service";
import { OAuthController } from "./oauth/oauth.controller";
import { OAuthService } from "./oauth/oauth.service";

@Module({
  imports: [DatabaseModule],
  controllers: [MembersController, OAuthController],
  providers: [MembersService, OAuthService],
})
export class MembersModule {}
