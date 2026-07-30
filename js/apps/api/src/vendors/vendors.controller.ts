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

// ─── Guards ───────────────────────────────────────────────────────────────────

/**
 * Temporary admin guard.
 * Reads `x-admin-token` header and compares to `ADMIN_API_TOKEN` env var.
 * Replace with a proper Passport/JWT guard once admin auth (Entra) is wired.
 */
@Injectable()
class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedToken = process.env["ADMIN_API_TOKEN"];

    if (!expectedToken) {
      // Block in production when the env var is not set; allow in dev for convenience
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
 * Temporary member guard.
 * Reads `x-member-token` header and compares to `MEMBER_API_TOKEN` env var.
 *
 * This is a placeholder until real member auth (Google / Facebook / Microsoft
 * OAuth via the member portal) is implemented. It prevents unauthenticated
 * callers from creating or editing vendor records by guessing owner IDs.
 *
 * Replace with a proper JWT guard once member auth is wired.
 */
@Injectable()
class MemberGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedToken = process.env["MEMBER_API_TOKEN"];

    if (!expectedToken) {
      // Block in production when the env var is not set; allow in dev for convenience
      if (process.env["NODE_ENV"] === "production") {
        throw new ForbiddenException("Member access is not configured");
      }
      return true;
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const provided = request.headers["x-member-token"];

    if (provided !== expectedToken) {
      throw new ForbiddenException("Invalid member token");
    }

    return true;
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────

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
 * Member routes (MemberGuard — replace with JWT guard):
 *   POST  /api/vendors             Create a vendor application
 *   PATCH /api/vendors/:id         Update own vendor profile
 *
 * Admin routes (AdminGuard — replace with JWT guard):
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
  // Declared before :id to avoid NestJS route shadowing.

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

  // ─── Member (MemberGuard protected) ───────────────────────────────────────

  @Post()
  @UseGuards(MemberGuard)
  create(
    @Body() dto: CreateVendorDto,
    // TODO: replace with real auth guard — extract ownerId from JWT claims
    @Query("ownerId") ownerId: string,
  ) {
    return this.vendorsService.create(ownerId, dto);
  }

  @Patch(":id")
  @UseGuards(MemberGuard)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateVendorDto,
    // TODO: replace with real auth guard — extract ownerId from JWT claims
    @Query("ownerId") ownerId: string,
  ) {
    return this.vendorsService.update(id, ownerId, dto);
  }
}
