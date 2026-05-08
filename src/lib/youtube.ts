import type { ApiSort, PeriodApi } from "@/lib/search-query";

export function publishedAfterForPeriod(period: PeriodApi): string | undefined {
  const now = new Date();
  const startUtcDay = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));

  switch (period) {
    case "today":
      return startUtcDay(now).toISOString();
    case "yesterday": {
      const y = new Date(now);
      y.setUTCDate(y.getUTCDate() - 1);
      return startUtcDay(y).toISOString();
    }
    case "week":
      return new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    case "month":
      return new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
    case "year":
      return new Date(now.getTime() - 365 * 24 * 3600 * 1000).toISOString();
    case "all":
    default:
      return undefined;
  }
}

export function searchListOrder(sort: ApiSort): "relevance" | "date" | "videoCount" {
  if (sort.startsWith("views")) return "videoCount";
  if (sort.startsWith("date")) return "date";
  return "relevance";
}

const BASE = "https://www.googleapis.com/youtube/v3";

export class YouTubeApiError extends Error {
  declare status: number;
  declare reason?: string;

  constructor(message: string, status: number, reason?: string) {
    super(message);
    this.name = "YouTubeApiError";
    this.status = status;
    this.reason = reason;
  }
}

type YtSearchItem = {
  id?: { videoId?: string };
  snippet?: { channelId?: string; channelTitle?: string };
};

type YtSearchResponse = {
  items?: YtSearchItem[];
  error?: { message?: string; errors?: { reason?: string }[] };
};

type YtVideoItem = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
    defaultLanguage?: string;
    defaultAudioLanguage?: string;
  };
  contentDetails?: { duration?: string };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
};

type YtVideosResponse = {
  items?: YtVideoItem[];
  error?: { message?: string; errors?: { reason?: string }[] };
};

export function parseDurationToSeconds(iso8601: string): number {
  const m = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  return h * 3600 + min * 60 + s;
}

export type SearchYouTubeParams = {
  query: string;
  apiKey: string;
  maxResults?: number;
  regionCode?: string;
  relevanceLanguage?: string;
  publishedAfter?: string;
  order: "relevance" | "date" | "videoCount";
};

export async function searchYouTubeVideos(params: SearchYouTubeParams): Promise<string[]> {
  const u = new URL(`${BASE}/search`);
  u.searchParams.set("part", "snippet");
  u.searchParams.set("type", "video");
  u.searchParams.set("q", params.query);
  u.searchParams.set("maxResults", String(params.maxResults ?? 50));
  u.searchParams.set("videoDuration", "short");
  u.searchParams.set("order", params.order);
  u.searchParams.set("key", params.apiKey);
  if (params.regionCode) u.searchParams.set("regionCode", params.regionCode);
  if (params.relevanceLanguage) u.searchParams.set("relevanceLanguage", params.relevanceLanguage);
  if (params.publishedAfter) u.searchParams.set("publishedAfter", params.publishedAfter);

  const res = await fetch(u.toString(), { cache: "no-store" });
  const data = (await res.json()) as YtSearchResponse;

  if (!res.ok) {
    const reason = data.error?.errors?.[0]?.reason;
    throw new YouTubeApiError(data.error?.message || res.statusText, res.status, reason);
  }

  const ids =
    data.items
      ?.map((i) => i.id?.videoId)
      .filter((id): id is string => Boolean(id)) ?? [];
  return ids;
}

export async function fetchVideoDetails(videoIds: string[], apiKey: string): Promise<YtVideoItem[]> {
  if (videoIds.length === 0) return [];
  const out: YtVideoItem[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const u = new URL(`${BASE}/videos`);
    u.searchParams.set("part", "snippet,statistics,contentDetails");
    u.searchParams.set("id", chunk.join(","));
    u.searchParams.set("key", apiKey);

    const res = await fetch(u.toString(), { cache: "no-store" });
    const data = (await res.json()) as YtVideosResponse;

    if (!res.ok) {
      const reason = data.error?.errors?.[0]?.reason;
      throw new YouTubeApiError(data.error?.message || res.statusText, res.status, reason);
    }
    out.push(...(data.items ?? []));
  }
  return out;
}

export type ParsedYoutubeVideo = {
  youtubeVideoId: string;
  url: string;
  title: string;
  description: string | null;
  channelId: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  publishedAt: Date;
  durationSeconds: number;
  views: number;
  likes: number;
  comments: number;
  language: string | null;
};

export function parseYoutubeVideoItem(item: YtVideoItem): ParsedYoutubeVideo | null {
  const id = item.id;
  const cd = item.contentDetails?.duration;
  if (!id || !cd) return null;
  const durationSeconds = parseDurationToSeconds(cd);
  const snippet = item.snippet;
  const publishedRaw = snippet?.publishedAt;
  if (!publishedRaw) return null;
  const publishedAt = new Date(publishedRaw);
  const thumbs = snippet?.thumbnails;
  const thumbnailUrl =
    thumbs?.high?.url ?? thumbs?.medium?.url ?? thumbs?.default?.url ?? null;
  const stats = item.statistics;
  const views = Number(stats?.viewCount ?? 0);
  const likes = Number(stats?.likeCount ?? 0);
  const comments = Number(stats?.commentCount ?? 0);

  return {
    youtubeVideoId: id,
    url: `https://www.youtube.com/watch?v=${id}`,
    title: snippet?.title ?? id,
    description: snippet?.description ?? null,
    channelId: snippet?.channelId ?? null,
    channelTitle: snippet?.channelTitle ?? null,
    thumbnailUrl,
    publishedAt,
    durationSeconds,
    views,
    likes,
    comments,
    language: snippet?.defaultAudioLanguage ?? snippet?.defaultLanguage ?? null,
  };
}
