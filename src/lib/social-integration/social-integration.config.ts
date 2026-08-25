import type { SocialPlatform } from "@/lib/profile/profile-types";
import type { SocialOAuthProviderId, SocialPlatformIntegration } from "./social-integration.types";

function envReady(...keys: string[]): boolean {
  return keys.every((k) => Boolean(process.env[k]?.trim()));
}

const BASE: Record<
  SocialPlatform,
  Omit<SocialPlatformIntegration, "platform" | "oauthAvailable" | "statusMessage">
> = {
  instagram: {
    manualFallback: true,
    provider: "meta",
    connectPath: "/api/social/oauth/instagram/start",
    scopes: ["instagram_basic", "instagram_manage_insights", "pages_show_list"],
  },
  tiktok: {
    manualFallback: true,
    provider: "tiktok",
    connectPath: "/api/social/oauth/tiktok/start",
    scopes: ["user.info.basic", "video.list"],
  },
  youtube: {
    manualFallback: true,
    provider: "google",
    connectPath: "/api/social/oauth/youtube/start",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
  },
};

function oauthReady(platform: SocialPlatform): boolean {
  if (platform === "instagram") {
    return envReady("META_APP_ID", "META_APP_SECRET", "META_OAUTH_REDIRECT_URI");
  }
  if (platform === "tiktok") {
    return envReady("TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_OAUTH_REDIRECT_URI");
  }
  return envReady("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI");
}

function statusMessage(platform: SocialPlatform, available: boolean): string {
  if (available) return "OAuth готов к подключению.";
  const provider: Record<SocialOAuthProviderId, string> = {
    meta: "Meta",
    tiktok: "TikTok",
    google: "Google",
  };
  return `Ожидает ключи ${provider[BASE[platform].provider]} API — пока доступен ручной ввод в профиле.`;
}

export function getSocialPlatformIntegration(platform: SocialPlatform): SocialPlatformIntegration {
  const oauthAvailable = oauthReady(platform);
  return {
    platform,
    oauthAvailable,
    statusMessage: statusMessage(platform, oauthAvailable),
    ...BASE[platform],
  };
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = ["instagram", "tiktok", "youtube"];

export function getAllSocialIntegrations(): SocialPlatformIntegration[] {
  return SOCIAL_PLATFORMS.map(getSocialPlatformIntegration);
}
