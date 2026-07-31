import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User, UserDocument, Vendor, VendorDocument } from "../database";
import { ForgotPasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from "./members.dto";

/**
 * Returns true when the stub auth endpoints should be disabled.
 *
 * Stub auth (register/login with no real password validation or JWT) is
 * ONLY allowed when:
 *   1. NODE_ENV is not "production", AND
 *   2. ALLOW_STUB_AUTH=true is explicitly set.
 *
 * This prevents the stub from running in staging/preview environments that
 * are not marked "production" but are still publicly reachable.
 */
function isStubAuthDisabled(): boolean {
  if (process.env["NODE_ENV"] === "production") return true;
  return process.env["ALLOW_STUB_AUTH"] !== "true";
}

/**
 * MembersService — stub implementation.
 *
 * Real authentication (Google / Facebook / Microsoft OAuth) is not yet wired.
 * These methods return placeholder responses so the member portal can function
 * end-to-end in LOCAL DEVELOPMENT ONLY (requires ALLOW_STUB_AUTH=true).
 *
 * TODO: Replace password-based stubs with OAuth token exchange.
 * TODO: Replace image upload stub with Cloudflare R2 upload.
 */
@Injectable()
export class MembersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Vendor.name)
    private readonly vendorModel: Model<VendorDocument>,
  ) {}

  // ─── Auth stubs ───────────────────────────────────────────────────────────

  /**
   * Stub register — creates a User record and a pending Vendor record.
   * Returns a fake session token until real OAuth is implemented.
   *
   * DISABLED unless ALLOW_STUB_AUTH=true and NODE_ENV != "production".
   */
  async register(dto: RegisterDto): Promise<{
    memberId: string;
    email: string;
    businessName: string;
    token: string;
  }> {
    if (isStubAuthDisabled()) {
      throw new ServiceUnavailableException(
        "Registration is not yet available — OAuth sign-up coming soon. " +
        "Set ALLOW_STUB_AUTH=true in local dev to use the stub.",
      );
    }

    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() }).exec();
    if (existing) {
      throw new BadRequestException("An account with this email already exists");
    }

    const user = await new this.userModel({
      email: dto.email.toLowerCase(),
      displayName: dto.businessName,
      defaultHandle: dto.email.split("@")[0],
      passwordHash: null, // TODO: hash dto.password when email+password auth is enabled
    }).save();

    await new this.vendorModel({
      ownerId: user._id,
      status: "pending",
      businessName: dto.businessName,
      category: dto.category,
      citySlug: dto.citySlug,
      address: dto.address ?? "",
      contact: {
        phone: dto.phone ?? null,
        email: dto.email,
        website: dto.website ?? null,
      },
    }).save();

    // TODO: issue a real JWT once auth is wired
    return {
      memberId: (user._id as Types.ObjectId).toHexString(),
      email: user.email,
      businessName: dto.businessName,
      token: `stub-token-${(user._id as Types.ObjectId).toHexString()}`,
    };
  }

  /**
   * Stub login — looks up the user by email and returns a fake session token.
   * Password is not validated until real auth is implemented.
   *
   * DISABLED unless ALLOW_STUB_AUTH=true and NODE_ENV != "production".
   */
  async login(dto: LoginDto): Promise<{
    memberId: string;
    email: string;
    businessName: string;
    token: string;
  }> {
    if (isStubAuthDisabled()) {
      throw new ServiceUnavailableException(
        "Login is not yet available — OAuth sign-in coming soon. " +
        "Set ALLOW_STUB_AUTH=true in local dev to use the stub.",
      );
    }

    const user = await this.userModel.findOne({ email: dto.email.toLowerCase() }).exec();
    if (!user) {
      throw new NotFoundException("No account found with this email address");
    }

    const vendor = await this.vendorModel.findOne({ ownerId: user._id }).exec();

    // TODO: validate dto.password against user.passwordHash when email+password auth is enabled
    return {
      memberId: (user._id as Types.ObjectId).toHexString(),
      email: user.email,
      businessName: vendor?.businessName ?? user.displayName,
      token: `stub-token-${(user._id as Types.ObjectId).toHexString()}`,
    };
  }

  /**
   * Stub forgot-password — logs the request and returns success.
   * Real email delivery via Resend will be added when auth is implemented.
   *
   * Always returns success regardless of whether the email exists to avoid
   * leaking account existence information.
   */
  async forgotPassword(_dto: ForgotPasswordDto): Promise<void> {
    // TODO: send a real password-reset email via Resend
    // Intentionally does not reveal whether the email is registered.
  }

  // ─── Profile ──────────────────────────────────────────────────────────────

  /** Returns the vendor profile owned by the given member */
  async getMe(memberId: string): Promise<VendorDocument> {
    const ownerId = this.toObjectId(memberId, "memberId");
    const vendor = await this.vendorModel.findOne({ ownerId }).lean().exec();
    if (!vendor) {
      throw new NotFoundException("No vendor profile found for this member");
    }
    return vendor as unknown as VendorDocument;
  }

  /** Updates the vendor profile owned by the given member */
  async updateMe(memberId: string, dto: UpdateProfileDto): Promise<VendorDocument> {
    const ownerId = this.toObjectId(memberId, "memberId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = {};
    if (dto.address !== undefined) update.address = dto.address;
    if (dto.descriptionMarkdown !== undefined) update.descriptionMarkdown = dto.descriptionMarkdown;
    if (dto.searchTags !== undefined) update.searchTags = dto.searchTags;
    if (dto.categoryData !== undefined) update.categoryData = dto.categoryData;
    // Use dot-path keys for nested contact fields so that a partial contact
    // update (e.g. only { phone: "..." }) does not wipe out the other fields.
    // Assigning update.contact = dto.contact would replace the entire sub-document.
    if (dto.contact !== undefined) {
      const c = dto.contact as Record<string, unknown>;
      if (c["phone"] !== undefined) update["contact.phone"] = c["phone"];
      if (c["email"] !== undefined) update["contact.email"] = c["email"];
      if (c["website"] !== undefined) update["contact.website"] = c["website"];
    }

    const vendor = await this.vendorModel
      .findOneAndUpdate({ ownerId }, { $set: update }, { new: true })
      .lean()
      .exec();

    if (!vendor) {
      throw new NotFoundException("No vendor profile found for this member");
    }

    return vendor as unknown as VendorDocument;
  }

  /**
   * Image upload stub.
   *
   * Currently throws `ServiceUnavailableException` (503) because Cloudflare R2
   * is not yet wired. The member portal should handle this gracefully and show
   * a "coming soon" message rather than an unhandled error.
   *
   * TODO: upload to Cloudflare R2 and return the real CDN URL.
   */
  async uploadImage(_memberId: string, _file: Express.Multer.File): Promise<{ url: string }> {
    throw new ServiceUnavailableException(
      "Image upload is not yet implemented — Cloudflare R2 integration coming soon",
    );
  }

  /**
   * Removes an image URL from the vendor's images array.
   */
  async deleteImage(memberId: string, url: string): Promise<void> {
    const ownerId = this.toObjectId(memberId, "memberId");
    await this.vendorModel
      .updateOne({ ownerId }, { $pull: { images: url } })
      .exec();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private toObjectId(id: string, label: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}: "${id}"`);
    }
    return new Types.ObjectId(id);
  }
}
