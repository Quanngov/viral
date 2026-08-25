import "server-only";

import type { SocialPlatform } from "@/lib/profile/profile-types";
import { getSocialPlatformIntegration } from "./social-integration.config";
import { getSocialOAuthProvider } from "./providers";
import type { SocialOAuthStartResult, SocialProfileSnapshot } from "./social-integration.types";

/**
 * Provider contract — each platform implements OAuth + profile/stats fetch.
 * Stubs return honest "not configured" until credentials and APIs are wired.
 */
export type SocialOAuthProvider = {
  platform: SocialPlatform;
  buildAuthorizationUrl(state: string): string | null;
  exchangeCodeForTokens(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date } | null>;
  fetchProfile(accessToken: string): Promise<SocialProfileSnapshot | null>;
};

export function startSocialOAuth(platform: SocialPlatform, state: string): SocialOAuthStartResult {
  const integration = getSocialPlatformIntegration(platform);

  if (!integration.oauthAvailable) {
    return {
      mode: "manual",
      message: integration.statusMessage,
      profilePath: "/?tab=profile",
    };
  }

  const provider = getSocialOAuthProvider(platform);
  const url = provider.buildAuthorizationUrl(state);

  if (!url) {
    return {
      mode: "manual",
      message: "OAuth-провайдер ещё не настроен.",
      profilePath: "/?tab=profile",
    };
  }

  return { mode: "redirect", url };
}

export async function completeSocialOAuth(
  platform: SocialPlatform,
  code: string,
): Promise<{ snapshot: SocialProfileSnapshot; tokens: { accessToken: string; refreshToken?: string; expiresAt?: Date } } | null> {
  const integration = getSocialPlatformIntegration(platform);
  if (!integration.oauthAvailable) return null;

  const provider = getSocialOAuthProvider(platform);
  const tokens = await provider.exchangeCodeForTokens(code);
  if (!tokens) return null;

  const snapshot = await provider.fetchProfile(tokens.accessToken);
  if (!snapshot) return null;

  return { snapshot, tokens };
}
