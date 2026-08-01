import { Controller, Get } from "@nestjs/common";
import { PlansService } from "./plans.service";

@Controller("plans")
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  /**
   * Returns all active subscription plans.
   * GET /api/plans
   */
  @Get()
  findAll() {
    return this.plansService.findAll();
  }
}
