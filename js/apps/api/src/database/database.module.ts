import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  GameSession,
  GameSessionSchema,
  GameParticipant,
  GameParticipantSchema,
  GameArchive,
  GameArchiveSchema,
  User,
  UserSchema,
  Session,
  SessionSchema,
  SubscriptionPlan,
  SubscriptionPlanSchema,
  Subscription,
  SubscriptionSchema,
  Vendor,
  VendorSchema,
  BoosterConfig,
  BoosterConfigSchema,
  VendorSubscriptionTier,
  VendorSubscriptionTierSchema,
} from "./schemas";

/**
 * Reads the MongoDB connection string from the MONGO_URI_FILE secret (Docker
 * Swarm) or falls back to the MONGO_URI environment variable (local dev).
 * The database name is always taken from MONGO_DB.
 */
function buildMongoUri(): string {
  const fs = require("fs") as typeof import("fs");
  const uriFile = process.env.MONGO_URI_FILE;
  const uri = uriFile
    ? fs.readFileSync(uriFile, "utf8").trim()
    : (process.env.MONGO_URI ?? "mongodb://localhost:27017");

  const db = process.env.MONGO_DB ?? "mh-dev";

  // If the URI already contains a database path, replace it; otherwise append.
  const url = new URL(uri.startsWith("mongodb+srv") ? uri : uri.replace("mongodb://", "http://"));
  url.pathname = `/${db}`;
  return uri.startsWith("mongodb+srv")
    ? url.toString()
    : url.toString().replace("http://", "mongodb://");
}

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: buildMongoUri(),
        // Retry on startup so the API doesn't crash if MongoDB is still booting
        serverSelectionTimeoutMS: 10_000,
        retryWrites: true,
      }),
    }),
    MongooseModule.forFeature([
      { name: GameSession.name, schema: GameSessionSchema },
      { name: GameParticipant.name, schema: GameParticipantSchema },
      { name: GameArchive.name, schema: GameArchiveSchema },
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: BoosterConfig.name, schema: BoosterConfigSchema },
      { name: VendorSubscriptionTier.name, schema: VendorSubscriptionTierSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
