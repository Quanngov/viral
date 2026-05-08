import type { Video } from "@prisma/client";
import { formatAgeCompactRu, formatRelativeRu, formatViewsCount } from "@/lib/format-video";

function viralLabelFromRating(rating: number): "High Viral" | "Rising" | "Stable" {
  if (rating >= 85) return "High Viral";
  if (rating >= 50) return "Rising";
  return "Stable";
}

/** Ответ для карточек и overlay (единый формат). */
export function videoToClientJson(v: Video) {
  const thumb =
    v.thumbnailUrl?.trim() || `https://i.ytimg.com/vi/${v.youtubeVideoId}/hqdefault.jpg`;
  const rating = Math.min(99, Math.max(1, v.score));
  return {
    id: v.youtubeVideoId,
    title: v.title,
    channel: v.channelTitle ?? "—",
    description: v.description ?? "",
    views: formatViewsCount(v.views),
    likes: formatViewsCount(v.likes),
    publishedAt: formatRelativeRu(v.publishedAt),
    publishedAtIso: v.publishedAt.toISOString(),
    ageCompact: formatAgeCompactRu(v.publishedAt),
    summary: v.description?.slice(0, 320) ?? "",
    viralScore: Math.round(v.viralScore * 100) / 100,
    rating,
    score: rating,
    viralLabel: viralLabelFromRating(rating),
    thumbnailUrl: thumb,
    url: v.url,
    comments: v.comments,
    viewsPerHour: Math.round(v.viewsPerHour * 100) / 100,
    engagementRate: Math.round(v.engagementRate * 1e6) / 1e6,
    language: v.language,
    region: v.region,
  };
}

/** Компактная запись для левой колонки «тренды». */
export function videoToTrendingJson(v: Video) {
  const thumb =
    v.thumbnailUrl?.trim() || `https://i.ytimg.com/vi/${v.youtubeVideoId}/hqdefault.jpg`;
  return {
    id: v.youtubeVideoId,
    title: v.title,
    views: formatViewsCount(v.views),
    thumbnailUrl: thumb,
  };
}
