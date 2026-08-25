import "server-only";

import type { SocialPlatform } from "@/lib/profile/profile-types";
import type { SocialProvider } from "./social-provider.interface";
import { instagramProvider } from "./providers/instagram-provider";
import { tiktokProvider } from "./providers/tiktok-provider";
import { youtubeProvider } from "./providers/youtube-provider";

const PROVIDERS: Record<SocialPlatform, SocialProvider> = {
  youtube: youtubeProvider,
  instagram: instagramProvider,
  tiktok: tiktokProvider,
};

export function getSocialProvider(platform: SocialPlatform): SocialProvider {
  return PROVIDERS[platform];
}

export function listSocialProviders(): SocialProvider[] {
  return Object.values(PROVIDERS);
}

export function isSocialPlatform(value: string): value is SocialPlatform {
  return value === "youtube" || value === "instagram" || value === "tiktok";
}
