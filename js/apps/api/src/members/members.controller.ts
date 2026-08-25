import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MembersService } from "./members.service";
import { ForgotPasswordDto, LoginDto, RegisterDto, SocialLoginDto, UpdateProfileDto } from "./members.dto";
import { resolveMemberId } from "../common/session";

/**
 * Members REST API — vendor self-service endpoints.
 *
 * `main.ts` sets `app.setGlobalPrefix("api")`, so the effective URLs are:
 *
 * Public (no auth):
 *   POST /api/members/register        Register a new vendor account (stub — ALLOW_STUB_AUTH required)
 *   POST /api/members/login           Log in (stub — ALLOW_STUB_AUTH required)
 *   POST /api/members/forgot-password Request a password reset email (stub)
 *
 * Authenticated (Bearer token from login response):
 *   GET    /api/members/me            Get own vendor profile
 *   PATCH  /api/members/me            Update own vendor profile
 *   POST   /api/members/me/images     Upload a profile image (stub — R2 not yet wired)
 *   DELETE /api/members/me/images     Remove a profile image URL
 *
 * NOTE: Auth is stubbed — the token from login is a placeholder string of the
 * form `stub-token-<userId>`. The `@Req()` parameter is used to extract the
 * memberId from the Authorization header until a real JWT guard is added.
 * Missing/invalid tokens now return 401 Unauthorized (not 404/400).
 *
 * TODO: Replace stub token extraction with a proper JWT guard.
 * TODO: Replace image upload stub with Cloudflare R2 integration.
 */
@Controller("members")
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.membersService.register(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.membersService.login(dto);
  }

  @Post("oauth/:provider")
  socialLogin(@Param("provider") provider: string, @Body() dto: SocialLoginDto) {
    // Stub provider sign-in (google | instagram | amazon | entra-work | entra-personal).
    return this.membersService.socialLogin(provider, dto ?? {});
  }

  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.membersService.forgotPassword(dto);
  }

  // ─── Authenticated ────────────────────────────────────────────────────────

  @Get("me")
  getMe(@Req() req: { headers: Record<string, string> }) {
    const memberId = extractMemberIdOrThrow(req);
    return this.membersService.getMe(memberId);
  }

  @Patch("me")
  updateMe(
    @Req() req: { headers: Record<string, string> },
    @Body() dto: UpdateProfileDto,
  ) {
    const memberId = extractMemberIdOrThrow(req);
    return this.membersService.updateMe(memberId, dto);
  }

  @Post("me/images")
  @UseInterceptors(FileInterceptor("file"))
  uploadImage(
    @Req() req: { headers: Record<string, string> },
    @UploadedFile() file: Express.Multer.File,
  ) {
    const memberId = extractMemberIdOrThrow(req);
    return this.membersService.uploadImage(memberId, file);
  }

  @Delete("me/images")
  deleteImage(
    @Req() req: { headers: Record<string, string> },
    @Body("url") url: string,
  ) {
    const memberId = extractMemberIdOrThrow(req);
    return this.membersService.deleteImage(memberId, url);
  }
}

/**
 * Extracts the memberId from a stub Bearer token of the form
 * `stub-token-<userId>`.
 *
 * Throws `UnauthorizedException` (401) when the token is absent or malformed,
 * so callers get a clear auth error rather than a confusing 404/400.
 * The all-zeros ObjectId previously returned as a fallback was problematic
 * because it is a valid ObjectId that could theoretically match a real record.
 *
 * TODO: Replace with a proper JWT guard that validates the token and injects
 * the memberId via a custom decorator.
 */
function extractMemberIdOrThrow(req: { headers: Record<string, string> }): string {
  // A real signed OAuth session is accepted anywhere; the dev-only stub token is
  // accepted only when ALLOW_STUB_AUTH is on (both handled by resolveMemberId).
  const memberId = resolveMemberId(req.headers["authorization"]);
  if (!memberId) {
    throw new UnauthorizedException(
      "Missing or invalid session — please sign in again",
    );
  }
  return memberId;
}
