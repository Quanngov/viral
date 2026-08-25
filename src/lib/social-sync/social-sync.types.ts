import type { SocialPlatform } from "@/lib/profile/profile-types";

export type SocialAuthMethod = "manual" | "oauth";

export type SocialConnectionStatus =
  | "disconnected"
  | "pending_oauth"
  | "connected"
  | "error"
  | "revoked";

export type SocialConnectionHealth =
  | "healthy"
  | "degraded"
  | "error"
  | "disconnected"
  | "revoked";

export type SocialSyncStatus = "idle" | "queued" | "running" | "failed";

export type SocialUpdateStrategy = "polling" | "webhook" | "hybrid";

export type SyncTrigger = "initial" | "scheduled" | "manual" | "webhook" | "retry";

export type SyncJobStatus = "pending" | "running" | "completed" | "failed" | "dead_letter";

export type WebhookEventStatus = "pending" | "processing" | "processed" | "failed" | "dead_letter";

export type WebhookSubscriptionStatus = "inactive" | "active" | "error" | "revoked";

export type ProviderCapability = {
  oauth: boolean;
  webhooks: boolean;
  profileMetrics: boolean;
  videoMetrics: boolean;
  analyticsInsights: boolean;
  /** Human-readable notes about API limitations */
  limitations: string[];
};

export type ProviderContext = {
  accountId: string;
  userId: string;
  platform: SocialPlatform;
  externalAccountId: string;
  username: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date | null;
  scopes?: string[];
  /** Provider-side user id (e.g. Facebook user id for Instagram disconnect). */
  providerUserId?: string;
};

export type OAuthConnectInput = {
  userId: string;
  platform: SocialPlatform;
  code: string;
  redirectUri: string;
};

export type OAuthConnectResult = {
  externalAccountId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
  /** Provider-side user id for revoke / disconnect (Facebook user id for Instagram). */
  providerUserId?: string;
};

export type ConnectionValidation = {
  valid: boolean;
  health: SocialConnectionHealth;
  errorCode?: string;
  errorMessage?: string;
  tokenExpiresAt?: Date | null;
};

export type ProfileRefreshResult = {
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
  username: string;
  followers: number | null;
  totalLikes: number | null;
  videoCount: number | null;
};

export type VideoRefreshResult = {
  videoCount: number | null;
  avgViews: number | null;
  totalComments: number | null;
  lastUploadAt: Date | null;
  bestVideo: {
    title: string;
    thumbnailUrl: string;
    url: string;
    views: number | null;
  } | null;
};

export type AnalyticsRefreshResult = {
  avgEngagement: number | null;
  monthlyViews: number | null;
  growthPercent: number | null;
  postingFreq: string | null;
  engagementRate: number | null;
};

export type RefreshResult = {
  profile: ProfileRefreshResult;
  videos: VideoRefreshResult;
  analytics: AnalyticsRefreshResult;
  statsSource: "api" | "pending";
  rawJson?: Record<string, unknown>;
};

export type WebhookRegistration = {
  externalSubId: string;
  callbackUrl: string;
  topics: string[];
};

export type WebhookVerifyResult = {
  valid: boolean;
  challenge?: string;
};

export type WebhookHandleResult = {
  eventType: string;
  externalEventId: string;
  enqueueSync: boolean;
  accountExternalId?: string;
};

export type SyncErrorCode =
  | "token_expired"
  | "token_revoked"
  | "rate_limited"
  | "provider_down"
  | "network_error"
  | "invalid_connection"
  | "not_configured"
  | "unknown";

export type ClassifiedSyncError = {
  code: SyncErrorCode;
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
};

export const SOCIAL_PLATFORMS: SocialPlatform[] = ["youtube", "instagram", "tiktok"];

export const DEFAULT_SYNC_INTERVAL_HOURS = 4;
export const MANUAL_REFRESH_COOLDOWN_MINUTES = 15;
export const MAX_SYNC_ATTEMPTS = 5;
