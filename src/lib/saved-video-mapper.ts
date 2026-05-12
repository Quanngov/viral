import type { SavedVideo } from "@prisma/client";
import type { GridVideo } from "@/lib/mock-data";
import { formatAgeCompactRu, formatRelativeRu, formatViewsCount } from "@/lib/format-video";
import { parseVideoClientId, videoClientId } from "@/lib/video-client-id";

function parsePublishedAt(raw: unknown): Date | null {
  if (raw == null) return null;
  if (raw instanceof Date) {
    const t = raw.getTime();
    return Number.isNaN(t) ? null : raw;
  }
  if (typeof raw === "string" || typeof raw === "number") {
    const d = new Date(raw);
    const t = d.getTime();
    return Number.isNaN(t) ? null : d;
  }
  return null;
}
export type SaveVideoSourceType = "feed" | "competitor" | "unknown";

export type SaveVideoPayload = {
  platform: string;
  externalId: string;
  title: string;
  description?: string | null;
  url: string;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  authorUsername?: string | null;
  authorDisplayName?: string | null;
  authorAvatarUrl?: string | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  rating?: number | null;
  publishedAt?: string | null;
  durationSeconds?: number | null;
  sourceType?: SaveVideoSourceType | null;
  sourceId?: string | null;
};

function clampStr(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function looseParseInt(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(String(raw).replace(/\s/g, "").replace(/\u00a0/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export function gridVideoToSavePayload(
  video: GridVideo,
  opts?: { sourceType?: SaveVideoSourceType; sourceId?: string | null },
): SaveVideoPayload | null {
  const fromFields =
    video.platform && video.externalId
      ? { platform: video.platform, externalId: video.externalId }
      : parseVideoClientId(video.id);
  if (!fromFields?.externalId?.trim()) return null;

  const platform = fromFields.platform.trim();
  const externalId = fromFields.externalId.trim();
  const title = clampStr((video.title || "—").trim() || "—", 500);
  const url = (video.url || "").trim();
  if (!url.startsWith("http")) return null;

  const views = video.viewsCount ?? looseParseInt(video.views);
  const likes = video.likesCount ?? looseParseInt(video.likes);
  const comments = typeof video.comments === "number" ? video.comments : null;
  const shares = typeof video.shares === "number" ? video.shares : null;
  const rating = typeof video.rating === "number" ? video.rating : null;

  let publishedAt: string | null = null;
  if (video.publishedAtIso) {
    const d = new Date(video.publishedAtIso);
    if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
  }

  return {
    platform,
    externalId,
    title,
    description: video.description ?? null,
    url,
    videoUrl: video.videoUrl ?? null,
    thumbnailUrl: video.thumbnailUrl || null,
    authorUsername: video.authorUsername ?? null,
    authorDisplayName: video.channel ? clampStr(video.channel, 200) : null,
    authorAvatarUrl: video.authorAvatarUrl ?? null,
    views,
    likes,
    comments,
    shares,
    rating,
    publishedAt,
    durationSeconds: typeof video.durationSeconds === "number" ? video.durationSeconds : null,
    sourceType: opts?.sourceType ?? "unknown",
    sourceId: opts?.sourceId ?? null,
  };
}

export function savedVideoToGridVideo(row: SavedVideo): GridVideo {
  const id = videoClientId(row.platform, row.externalId);
  const views = row.views ?? 0;
  const likes = row.likes ?? 0;
  const comments = row.comments ?? 0;
  const published = parsePublishedAt(row.publishedAt);
  const ratingVal = row.rating ?? 0;
  const thumb =
    row.thumbnailUrl?.trim() ||
    (row.platform === "youtube" ? `https://i.ytimg.com/vi/${row.externalId}/hqdefault.jpg` : "");

  const platformUi: NonNullable<GridVideo["platform"]> =
    row.platform === "youtube" ? "youtube" : row.platform === "tiktok" ? "tiktok" : "instagram";

  return {
    id,
    platform: platformUi,
    externalId: row.externalId,
    youtubeId: row.platform === "youtube" ? row.externalId : null,
    title: row.title,
    channel: row.authorDisplayName ?? row.authorUsername ?? "—",
    description: row.description ?? "",
    views: formatViewsCount(views),
    likes: formatViewsCount(likes),
    publishedAt: published ? formatRelativeRu(published) : "дата неизвестна",
    publishedAtIso: published ? published.toISOString() : undefined,
    ageCompact: published ? formatAgeCompactRu(published) : undefined,
    viralScore: 0,
    rating: ratingVal,
    score: ratingVal,
    viralLabel: ratingVal >= 85 ? "High Viral" : ratingVal >= 50 ? "Rising" : "Stable",
    thumbnailUrl: thumb,
    url: row.url,
    videoUrl: row.videoUrl,
    comments,
    shares: row.shares ?? undefined,
    viewsCount: views,
    likesCount: likes,
    authorUsername: row.authorUsername ?? undefined,
    authorAvatarUrl: row.authorAvatarUrl ?? undefined,
    durationSeconds: row.durationSeconds ?? undefined,
  };
}