import type { SocialPlatform } from "@/lib/profile/profile-types";
import type {
  AnalyticsRefreshResult,
  ConnectionValidation,
  OAuthConnectInput,
  OAuthConnectResult,
  ProfileRefreshResult,
  ProviderCapability,
  ProviderContext,
  RefreshResult,
  VideoRefreshResult,
  WebhookHandleResult,
  WebhookRegistration,
  WebhookVerifyResult,
} from "./social-sync.types";

/**
 * Unified provider contract — every platform implements the same surface.
 * SocialSyncService is the only caller; UI never imports providers directly.
 */
export interface SocialProvider {
  readonly platform: SocialPlatform;
  readonly capabilities: ProviderCapability;

  buildAuthorizationUrl(state: string, redirectUri: string): string | null;

  connect(input: OAuthConnectInput): Promise<OAuthConnectResult | null>;

  disconnect(ctx: ProviderContext): Promise<void>;

  refresh(ctx: ProviderContext): Promise<RefreshResult>;

  refreshProfile(ctx: ProviderContext): Promise<ProfileRefreshResult>;

  refreshVideos(ctx: ProviderContext): Promise<VideoRefreshResult>;

  refreshAnalytics(ctx: ProviderContext): Promise<AnalyticsRefreshResult>;

  validateConnection(ctx: ProviderContext): Promise<ConnectionValidation>;

  refreshAccessToken?(ctx: ProviderContext): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  } | null>;

  verifyWebhook?(headers: Record<string, string>, rawBody: string): WebhookVerifyResult;

  handleWebhookEvent?(payload: unknown): Promise<WebhookHandleResult | null>;

  registerWebhook?(ctx: ProviderContext, callbackUrl: string): Promise<WebhookRegistration | null>;
}
