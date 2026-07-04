import type { CompetitorAccount, CompetitorVideo } from "@/lib/competitor-mock-data";
import type { GridVideo } from "@/lib/mock-data";
import type { LiveTrendVideo } from "@/lib/trends-display";
import { filterAndResolveDisplayableVideos, withResolvedTrendThumbnail } from "@/lib/grid-video-display";
import { mapTrendsPayload } from "@/lib/trends-display";
import type { DashboardInitialPayload } from "@/lib/dashboard-initial";
import type { CompetitorsBasePayload } from "@/lib/dashboard-fetch";

export type OnboardingPreviewData = {
  videos: GridVideo[];
  trends: LiveTrendVideo[];
  competitors: CompetitorAccount[];
  competitorVideos: CompetitorVideo[];
};

function parseViews(raw: string | number): number {
  if (typeof raw === "number") return raw;
  return Number(String(raw).replace(/\s/g, "").replace(/[^\d]/g, "")) || 0;
}

function homeVideosToCompetitorReels(
  account: CompetitorAccount,
  homeVideos: GridVideo[],
): CompetitorVideo[] {
  return homeVideos.slice(0, 4).map((v) => ({
    id: `ob-${v.id}`,
    competitorId: account.id,
    platform: (v.platform === "youtube" || v.platform === "tiktok" ? v.platform : "instagram") as
      | "youtube"
      | "instagram"
      | "tiktok",
    externalId: v.externalId,
    url: v.url ?? "#",
    title: v.title,
    thumbnailUrl: v.thumbnailUrl,
    views: parseViews(v.views),
    likes: 0,
    comments: 0,
    score: v.rating ?? 0,
    publishedAt: v.publishedAtIso ?? new Date().toISOString(),
    createdAt: new Date().toISOString(),
    authorUsername: v.authorUsername,
    authorDisplayName: v.channel,
  }));
}

export function buildOnboardingPreviewData(
  initial: DashboardInitialPayload,
  competitorsPayload: CompetitorsBasePayload | null,
): OnboardingPreviewData {
  const videos = filterAndResolveDisplayableVideos(initial.homeVideos);
  const trends = mapTrendsPayload(initial.trends).map((t) => ({
    ...t,
    thumbnailUrl:
      withResolvedTrendThumbnail({
        id: t.id,
        title: t.title,
        platform: t.platform,
        thumbnailUrl: t.thumbnailUrl,
      }).thumbnailUrl || t.thumbnailUrl,
  }));

  const apiCompetitors = (competitorsPayload?.competitors ?? []) as CompetitorAccount[];
  const apiVideos = (competitorsPayload?.videos ?? []) as CompetitorVideo[];

  if (apiCompetitors.length > 0 && apiVideos.length > 0) {
    return {
      videos,
      trends,
      competitors: apiCompetitors.slice(0, 4),
      competitorVideos: apiVideos.slice(0, 6),
    };
  }

  const lead = videos[0];
  const fallbackAccount: CompetitorAccount = {
    id: "onboarding-preview",
    platform: lead?.platform === "youtube" ? "youtube" : "instagram",
    username: lead?.authorUsername?.replace(/^@/, "") || "competitor",
    profileUrl: "#",
    displayName: lead?.channel || "Конкурент",
    addedAt: new Date().toISOString(),
  };

  return {
    videos,
    trends,
    competitors: [fallbackAccount],
    competitorVideos: homeVideosToCompetitorReels(fallbackAccount, videos),
  };
}
