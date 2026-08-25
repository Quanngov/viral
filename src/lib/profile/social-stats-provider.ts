import "server-only";

import type { SocialPlatform, StatsSource, ProfileBestVideo } from "@/lib/profile/profile-types";

export type SocialStatsFetchResult = {
  statsSource: StatsSource;
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
  followers: number | null;
  totalLikes: number | null;
  avgViews: number | null;
  avgEngagement: number | null;
  postingFreq: string | null;
  lastUploadAt: Date | null;
  growthPercent: number | null;
  bestVideo: ProfileBestVideo | null;
};

/**
 * Placeholder provider until Instagram / TikTok / YouTube analytics APIs are wired.
 * Returns honest pending state — never fabricates metrics.
 */
export async function fetchSocialAccountStats(
  platform: SocialPlatform,
  username: string,
): Promise<SocialStatsFetchResult> {
  const handle = username.replace(/^@/, "").trim();
  const profileUrl =
    platform === "instagram"
      ? `https://instagram.com/${handle}`
      : platform === "tiktok"
        ? `https://tiktok.com/@${handle}`
        : `https://youtube.com/@${handle}`;

  return {
    statsSource: "pending",
    displayName: handle,
    avatarUrl: "",
    profileUrl,
    followers: null,
    totalLikes: null,
    avgViews: null,
    avgEngagement: null,
    postingFreq: null,
    lastUploadAt: null,
    growthPercent: null,
    bestVideo: null,
  };
}
