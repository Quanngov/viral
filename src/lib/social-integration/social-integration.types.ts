/** Social OAuth / API integration — shared types (client + server). */

import type { SocialPlatform } from "@/lib/profile/profile-types";

export type SocialAuthMethod = "manual" | "oauth";

export type SocialConnectionStatus =
  | "disconnected"
  | "pending_oauth"
  | "connected"
  | "error"
  | "revoked";

export type SocialOAuthProviderId = "meta" | "tiktok" | "google";

export type SocialPlatformIntegration = {
  platform: SocialPlatform;
  /** Official OAuth login is wired and env credentials are present. */
  oauthAvailable: boolean;
  /** Manual username entry (legacy / fallback). */
  manualFallback: boolean;
  provider: SocialOAuthProviderId;
  /** API route that starts OAuth (returns redirect or manual fallback JSON). */
  connectPath: string;
  scopes: string[];
  statusMessage: string;
};

export type SocialOAuthStartResult =
  | { mode: "redirect"; url: string }
  | { mode: "manual"; message: string; profilePath: string };

export type SocialProfileSnapshot = {
  externalAccountId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
  followers: number | null;
  totalLikes: number | null;
  avgViews: number | null;
  avgEngagement: number | null;
  monthlyViews: number | null;
  postingFreq: string | null;
  lastUploadAt: Date | null;
  growthPercent: number | null;
};
