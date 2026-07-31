import {
  BadRequestException,
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
 *
 * Validates the stub `Authorization: Bearer stub-token-<24hex>` token that
 * the member portal sends after login. This is consistent with
 * `extractMemberIdOrThrow` which also reads the Bearer token — both the
 * guard and the helper use the same auth mechanism so the member portal only
 * needs to send one header.
 *
 * DEFAULT-DENY: stub tokens are only accepted when ALLOW_STUB_AUTH=true AND
 * NODE_ENV !== "production". In production the guard always blocks (until a
 * real JWT guard replaces this stub).
 *
 * Replace with a proper JWT guard once member auth (Google/Facebook/Microsoft
 * via Entra) is wired.
 */
@Injectable()
class MemberGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const stubAuthEnabled =
      process.env["ALLOW_STUB_AUTH"] === "true" &&
      process.env["NODE_ENV"] !== "production";

    if (!stubAuthEnabled) {
      throw new ForbiddenException(
        "Member auth is not configured — set ALLOW_STUB_AUTH=true for local dev (never in production)",
      );
    }

    // Validate that the request carries a well-formed stub Bearer token.
    // extractMemberIdOrThrow will re-validate below; this guard just ensures
    // the request is rejected early with a 403 before reaching the handler.
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const auth = request.headers["authorization"] ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!/^stub-token-[a-f0-9]{24}$/i.test(token)) {
      throw new UnauthorizedException(
        "Missing or invalid Authorization token — please log in again",
      );
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
 * or when stub auth is disabled (ALLOW_STUB_AUTH != true or NODE_ENV = production).
 *
 * MemberGuard runs first and rejects invalid tokens before the handler is
 * reached, so this function is a secondary safety net that also extracts the
 * memberId for use in the service layer.
 *
 * TODO: Replace with a proper JWT guard that validates the token and injects
 * the memberId via a custom decorator.
 */
function extractMemberIdOrThrow(req: { headers: Record<string, string> }): string {
  // Stub tokens are only valid when ALLOW_STUB_AUTH=true AND not in production.
  const stubAuthEnabled =
    process.env["ALLOW_STUB_AUTH"] === "true" &&
    process.env["NODE_ENV"] !== "production";

  const auth = req.headers["authorization"] ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const match = /^stub-token-([a-f0-9]{24})$/i.exec(token);

  if (!match) {
    throw new UnauthorizedException(
      "Missing or invalid Authorization token — please log in again",
    );
  }
  if (!stubAuthEnabled) {
    throw new UnauthorizedException(
      "Stub auth is disabled in this environment — use a real JWT",
    );
  }
  return match[1];
}

/** Allowed vendor status values for runtime validation */
const VALID_STATUSES: VendorStatus[] = ["pending", "approved", "rejected", "suspended"];

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * Vendors REST API
 *
 * `main.ts` sets `app.setGlobalPrefix("api")`, so the effective URLs are:
 *
 * Public routes (no auth required):
 *   GET  /api/vendors              Browse approved vendors (citySlug required)
 *   GET  /api/vendors/categories   List distinct categories for a city (citySlug required)
 *   GET  /api/vendors/:id          Get a single approved vendor
 *
 * Member routes (MemberGuard — replace with JWT guard):
 *   POST  /api/vendors             Create a vendor application (status: pending)
 *   PATCH /api/vendors/:id         Update own vendor profile
 *   Auth: Authorization: Bearer stub-token-<24hex> (same token from login response)
 *   ownerId is derived from the Bearer token, not from a query param.
 *
 * Admin routes (AdminGuard — replace with Entra JWT guard):
 *   GET   /api/vendors/admin/list        List all vendors (any status)
 *   PATCH /api/vendors/admin/:id/status  Set vendor status (approved/rejected/suspended)
 *
 * NOTE: Separate /approve and /feature endpoints mentioned in earlier drafts
 * were consolidated into PATCH /admin/:id/status for simplicity in Phase 1.
 * The `featured` flag will be managed via a dedicated endpoint in a future phase.
 */
@Controller("vendors")
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  @Get()
  browse(@Query() query: BrowseVendorsQueryDto) {
    // citySlug is required for correct multi-city routing — an empty or
    // missing citySlug would silently return an empty result set.
    if (!query.citySlug?.trim()) {
      throw new BadRequestException("citySlug query parameter is required");
    }
    return this.vendorsService.browse(query);
  }

  @Get("categories")
  getCategories(@Query("citySlug") citySlug: string) {
    // citySlug is required — silently defaulting to "seattle" would return the
    // wrong city's categories for any other city, causing hard-to-debug issues.
    if (!citySlug?.trim()) {
      throw new BadRequestException("citySlug query parameter is required");
    }
    return this.vendorsService.getCategories(citySlug);
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
    // Validate status before forwarding to the service. Mongoose runValidators
    // catches this too, but an explicit 400 here gives a clearer error message
    // and avoids a round-trip to the database for obviously invalid input.
    if (!status || !VALID_STATUSES.includes(status)) {
      throw new BadRequestException(
        `status must be one of: ${VALID_STATUSES.join(", ")}`,
      );
    }
    return this.vendorsService.setStatus(id, status);
  }

  // ─── Public (by ID) ───────────────────────────────────────────────────────

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.vendorsService.findOne(id);
  }

  // ─── Member (MemberGuard protected) ───────────────────────────────────────
  // Auth: Authorization: Bearer stub-token-<24hex> (same token from login response).
  // ownerId is derived from the Bearer token so that a token holder cannot
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
