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
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { VendorsService } from "./vendors.service";
import { BrowseVendorsQueryDto, CreateVendorDto, UpdateVendorDto } from "./vendors.dto";
import { VendorStatus } from "../database";

// ─── Guards ───────────────────────────────────────────────────────────────────

/**
 * Temporary admin guard.
 * Reads `x-admin-token` header and compares to `ADMIN_API_TOKEN` env var.
 *
 * DEFAULT-DENY: if `ADMIN_API_TOKEN` is not set the guard blocks all requests
 * regardless of environment. Set `ALLOW_INSECURE_ADMIN=true` explicitly in
 * local dev to bypass (never set this in staging or production).
 *
 * Replace with a proper Passport/JWT guard once admin auth (Entra) is wired.
 */
@Injectable()
class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedToken = process.env["ADMIN_API_TOKEN"];

    if (!expectedToken) {
      // Explicit opt-in for local dev only — never set in staging/production
      if (process.env["ALLOW_INSECURE_ADMIN"] === "true") {
        return true;
      }
      throw new ForbiddenException(
        "Admin access is not configured — set ADMIN_API_TOKEN or ALLOW_INSECURE_ADMIN=true for local dev",
      );
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
 * DEFAULT-DENY: if `MEMBER_API_TOKEN` is not set the guard blocks all requests
 * regardless of environment. Set `ALLOW_INSECURE_MEMBER=true` explicitly in
 * local dev to bypass.
 *
 * Replace with a proper JWT guard once member auth is wired.
 */
@Injectable()
class MemberGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedToken = process.env["MEMBER_API_TOKEN"];

    if (!expectedToken) {
      if (process.env["ALLOW_INSECURE_MEMBER"] === "true") {
        return true;
      }
      throw new ForbiddenException(
        "Member access is not configured — set MEMBER_API_TOKEN or ALLOW_INSECURE_MEMBER=true for local dev",
      );
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const provided = request.headers["x-member-token"];

    if (provided !== expectedToken) {
      throw new ForbiddenException("Invalid member token");
    }

    return true;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts the memberId from a stub Bearer token of the form
 * `stub-token-<userId>`.
 *
 * Throws `UnauthorizedException` (401) when the token is absent or malformed,
 * so callers get a clear auth error rather than a confusing 404/400.
 *
 * TODO: Replace with a proper JWT guard that validates the token and injects
 * the memberId via a custom decorator.
 */
function extractMemberIdOrThrow(req: { headers: Record<string, string> }): string {
  const auth = req.headers["authorization"] ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const match = /^stub-token-([a-f0-9]{24})$/i.exec(token);
  if (!match) {
    throw new UnauthorizedException(
      "Missing or invalid Authorization token — please log in again",
    );
  }
  return match[1];
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
 *   ownerId is derived from the stub Bearer token, not from a query param.
 *
 * Admin routes (AdminGuard — replace with Entra JWT guard):
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
  // ownerId is derived from the stub Bearer token so that a token holder cannot
  // create or update records for arbitrary owners by supplying a different ownerId.

  @Post()
  @UseGuards(MemberGuard)
  create(
    @Body() dto: CreateVendorDto,
    @Req() req: { headers: Record<string, string> },
  ) {
    const ownerId = extractMemberIdOrThrow(req);
    return this.vendorsService.create(ownerId, dto);
  }

  @Patch(":id")
  @UseGuards(MemberGuard)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateVendorDto,
    @Req() req: { headers: Record<string, string> },
  ) {
    const ownerId = extractMemberIdOrThrow(req);
    return this.vendorsService.update(id, ownerId, dto);
  }
}
