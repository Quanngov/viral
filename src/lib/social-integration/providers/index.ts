import type { SocialPlatform } from "@/lib/profile/profile-types";
import type { SocialOAuthProvider } from "../social-integration.service";
import { instagramOAuthProvider } from "./instagram";
import { tiktokOAuthProvider } from "./tiktok";
import { youtubeOAuthProvider } from "./youtube";

const PROVIDERS: Record<SocialPlatform, SocialOAuthProvider> = {
  instagram: instagramOAuthProvider,
  tiktok: tiktokOAuthProvider,
  youtube: youtubeOAuthProvider,
};

export function getSocialOAuthProvider(platform: SocialPlatform): SocialOAuthProvider {
  return PROVIDERS[platform];
}
