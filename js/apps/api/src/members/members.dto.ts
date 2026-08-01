/**
 * Data Transfer Objects for the Members module.
 *
 * NOTE: Real authentication (Google / Facebook / Microsoft OAuth) is not yet
 * implemented. These DTOs are stubs that allow the member portal to compile
 * and call the API. Replace with proper auth payloads once OAuth is wired.
 */

export class RegisterDto {
  declare businessName: string;
  declare category: string;
  declare citySlug: string;
  declare email: string;
  /** Temporary — will be replaced by OAuth token exchange */
  declare password: string;
  declare phone?: string;
  declare website?: string;
  declare address?: string;
}

export class LoginDto {
  declare email: string;
  /** Temporary — will be replaced by OAuth token exchange */
  declare password: string;
}

export class ForgotPasswordDto {
  declare email: string;
}

export class UpdateProfileDto {
  declare businessName?: string;
  declare category?: string;
  declare descriptionMarkdown?: string;
  declare address?: string;
  declare searchTags?: string[];
  declare categoryData?: Record<string, unknown>;
  declare contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  declare location?: {
    longitude: number;
    latitude: number;
  };
  declare images?: string[];
}
