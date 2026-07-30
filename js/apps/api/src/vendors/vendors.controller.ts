import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Injectable,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { VendorsService } from "./vendors.service";
import { BrowseVendorsQueryDto, CreateVendorDto, UpdateVendorDto } from "./vendors.dto";
import { VendorStatus } from "../database";

/**
 * Temporary admin guard that blocks all admin routes until a real JWT-based
 * admin auth guard is implemented. Reads the `x-admin-token` header and
 * compares it to the `ADMIN_API_TOKEN` environment variable.
 *
 * Replace this with a proper Passport/JWT guard once admin auth is in place.
 */
@Injectable()
class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedToken = process.env["ADMIN_API_TOKEN"];

    // If no token is configured, block all admin access in production.
    // In development (NODE_ENV !== "production") allow through so the
    // admin portal can be tested without setting up a token.
    if (!expectedToken) {
      if (process.env["NODE_ENV"] === "production") {
        throw new ForbiddenException("Admin access is not configured");
      }
      return true;
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const provided = request.headers["x-admin-token"];

    if (provided !== expectedToken) {
      throw new ForbiddenException("Invalid admin token");
    }

    return true;
  }
}

/**
 * Vendors REST API
 *
 * `main.ts` sets `app.setGlobalPrefix("api")`, so the effective URLs are:
 *
 * Public routes (no auth required):
 *   GET  /api/vendors              Browse approved vendors
 *   GET  /api/vendors/categories   List distinct categories for a city
 *   GET  /api/vendors/:id          Get a single approved vendor
 *
 * Member routes (vendor auth required — auth guard to be added):
 *   POST  /api/vendors             Create a vendor application
 *   PATCH /api/vendors/:id         Update own vendor profile
 *
 * Admin routes (protected by AdminGuard — replace with JWT guard):
 *   GET   /api/vendors/admin/list        List all vendors (any status)
 *   PATCH /api/vendors/admin/:id/status  Approve / reject a vendor
 */
@Controller("vendors")
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  @Get()
  browse(@Query() query: BrowseVendorsQueryDto) {
    return this.vendorsService.browse(query);
  }

  @Get("categories")
  getCategories(@Query("citySlug") citySlug: string) {
    return this.vendorsService.getCategories(citySlug ?? "seattle");
  }

  // ─── Admin (AdminGuard protected) ─────────────────────────────────────────
  // These routes are declared before :id to avoid NestJS route shadowing.

  @Get("admin/list")
  @UseGuards(AdminGuard)
  adminList(
    @Query("status") status: VendorStatus | undefined,
    @Query("page") page: string,
    @Query("limit") limit: string,
  ) {
    return this.vendorsService.adminList(status, Number(page) || 1, Number(limit) || 20);
  }

  @Patch("admin/:id/status")
  @UseGuards(AdminGuard)
  setStatus(
    @Param("id") id: string,
    @Body("status") status: VendorStatus,
  ) {
    return this.vendorsService.setStatus(id, status);
  }

  // ─── Public (by ID) ───────────────────────────────────────────────────────

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.vendorsService.findOne(id);
  }

  // ─── Member (Vendor Self-Service) ─────────────────────────────────────────

  @Post()
  create(
    @Body() dto: CreateVendorDto,
    // TODO: replace with real auth guard — extract ownerId from JWT
    @Query("ownerId") ownerId: string,
  ) {
    return this.vendorsService.create(ownerId, dto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateVendorDto,
    // TODO: replace with real auth guard — extract ownerId from JWT
    @Query("ownerId") ownerId: string,
  ) {
    return this.vendorsService.update(id, ownerId, dto);
  }
}
