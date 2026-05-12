import type { Video } from "@prisma/client";
import { videoClientId } from "@/lib/video-client-id";
import { formatAgeCompactRu, formatRelativeRu, formatViewsCount } from "@/lib/format-video";

function viralLabelFromRating(rating: number): "High Viral" | "Rising" | "Stable" {
  if (rating >= 85) return "High Viral";
  if (rating >= 50) return "Rising";
  return "Stable";
}

/** Ответ для карточек и overlay (единый формат). */
export function videoToClientJson(v: Video) {
  const id = videoClientId(v.platform, v.externalId);
  const ratingVal = Math.min(99, Math.max(0, v.rating > 0 ? v.rating : v.score));
  const thumb =
    v.thumbnailUrl?.trim() ||
    (v.platform === "youtube" ? `https://i.ytimg.com/vi/${v.externalId}/hqdefault.jpg` : "");
  const channel = v.channelTitle ?? v.authorDisplayName ?? v.authorUsername ?? "—";
  return {
    id,
    platform: v.platform as "youtube" | "instagram",
    externalId: v.externalId,
    youtubeId: v.platform === "youtube" ? v.externalId : null,
    title: v.title,
    channel,
    authorUsername: v.authorUsername,
    authorAvatarUrl: v.authorAvatarUrl,
    description: v.description ?? "",
    views: formatViewsCount(v.views),
    likes: formatViewsCount(v.likes),
    publishedAt: formatRelativeRu(v.publishedAt),
    publishedAtIso: v.publishedAt.toISOString(),
    ageCompact: formatAgeCompactRu(v.publishedAt),
    summary: v.description?.slice(0, 320) ?? "",
    viralScore: Math.round(v.viralScore * 100) / 100,
    rating: ratingVal,
    score: ratingVal,
    viralLabel: viralLabelFromRating(ratingVal),
    thumbnailUrl: thumb,
    url: v.url,
    videoUrl: v.videoUrl,
    comments: v.comments,
    shares: v.shares,
    viewsPerHour: Math.round(v.viewsPerHour * 100) / 100,
    engagementRate: Math.round(v.engagementRate * 1e6) / 1e6,
    language: v.language,
    region: v.region,
  };
}

/** Компактная запись для левой колонки «тренды». */
export function videoToTrendingJson(v: Video) {
  const id = videoClientId(v.platform, v.externalId);
  const thumb =
    v.thumbnailUrl?.trim() ||
    (v.platform === "youtube" ? `https://i.ytimg.com/vi/${v.externalId}/hqdefault.jpg` : "");
  return {
    id,
    title: v.title,
    views: formatViewsCount(v.views),
    thumbnailUrl: thumb,
  };
}
