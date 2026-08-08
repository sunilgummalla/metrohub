import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database";
import { SeedService } from "./seed.service";

/**
 * Seeds coherent sample data on boot when SEED_SAMPLE_DATA === "true".
 * DatabaseModule exports MongooseModule, so all models are injectable here.
 */
@Module({
  imports: [DatabaseModule],
  providers: [SeedService],
})
export class SeedModule {}
