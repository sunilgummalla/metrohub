import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { SubscriptionPlan, SubscriptionPlanDocument } from "../database";

/** Plain-object shape returned by .lean() — no Mongoose Document methods */
export type SubscriptionPlanLean = Omit<SubscriptionPlanDocument, keyof import("mongoose").Document>;

const SEED_PLANS = [
  {
    planId: "free",
    name: "Free",
    intervalDays: 0,
    prices: { INR: 0, USD: 0, CAD: 0 },
    features: [
      "Up to 3 simultaneous games",
      "Tambola, Bingo & Rummy scorecard",
      "Guest join by code",
      "24-hour game history",
    ],
    isActive: true,
  },
  {
    planId: "pro_monthly",
    name: "Pro",
    intervalDays: 30,
    prices: { INR: 9900, USD: 199, CAD: 249 },
    features: [
      "Unlimited simultaneous games",
      "All Free features",
      "Full game history & archives",
      "Custom player handles",
      "Priority support",
    ],
    isActive: true,
  },
  {
    planId: "family_monthly",
    name: "Family",
    intervalDays: 30,
    prices: { INR: 24900, USD: 499, CAD: 649 },
    features: [
      "Everything in Pro",
      "Up to 10 named players per game",
      "Persistent player profiles",
      "Game statistics & leaderboards",
      "Early access to new games",
    ],
    isActive: true,
  },
];

@Injectable()
export class PlansService implements OnModuleInit {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectModel(SubscriptionPlan.name)
    private readonly planModel: Model<SubscriptionPlanDocument>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  private async seed() {
    for (const plan of SEED_PLANS) {
      await this.planModel.updateOne(
        { planId: plan.planId },
        { $setOnInsert: plan },
        { upsert: true },
      );
    }
    this.logger.log("Subscription plans seeded");
  }

  async findAll(): Promise<SubscriptionPlanLean[]> {
    // .lean() returns plain JS objects, not Mongoose Documents.
    // Return type is SubscriptionPlanLean (plain shape) rather than
    // SubscriptionPlanDocument to avoid a type/runtime mismatch.
    return this.planModel.find({ isActive: true }).sort({ intervalDays: 1 }).lean() as unknown as SubscriptionPlanLean[];
  }
}
