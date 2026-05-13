import { prisma } from "@/lib/prisma";
import { parseDurationToSeconds } from "@/lib/youtube";
import { computeUniversalVideoRating } from "@/lib/rating";

const YT_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_COMPETITOR_VIDEO_DURATION_SECONDS = 60;
const DAILY_PLAYLIST_MAX = 15;

type YtVideoItem = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
  };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
};

async function ytFetch<T>(path: string, params: Record<string, string>, apiKey: string): Promise<T> {
  const url = new URL(`${YT_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  url.searchParams.set("key", apiKey);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    const message = data.error?.message ?? `YouTube API error: ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export type YouTubeDailyShallowResult = {
  ok: boolean;
  videosTouched: number;
  errorShort?: string;
};

/**
 * Лёгкое дневное обновление YouTube-конкурента: только последние элементы плейлиста загрузок.
 */
export async function syncYouTubeCompetitorDailyShallow(opts: {
  competitorId: string;
  uploadsPlaylistId: string;
  apiKey: string;
}): Promise<YouTubeDailyShallowResult> {
  const { competitorId, uploadsPlaylistId, apiKey } = opts;

  try {
    const playlist = await ytFetch<{
      items?: { contentDetails?: { videoId?: string } }[];
    }>(
      "playlistItems",
      {
        part: "snippet,contentDetails",
        playlistId: uploadsPlaylistId,
        maxResults: String(DAILY_PLAYLIST_MAX),
      },
      apiKey,
    );

    const videoIds = (playlist.items ?? [])
      .map((i) => i.contentDetails?.videoId)
      .filter((v): v is string => Boolean(v));
    if (videoIds.length === 0) {
      await prisma.competitorAccount.update({
        where: { id: competitorId },
        data: { lastSyncedAt: new Date() },
      });
      return { ok: true, videosTouched: 0 };
    }

    const details = await ytFetch<{ items?: YtVideoItem[] }>(
      "videos",
      {
        part: "snippet,statistics,contentDetails",
        id: videoIds.join(","),
      },
      apiKey,
    );

    const rows = details.items ?? [];
    const now = new Date();
    let videosTouched = 0;

    for (const item of rows) {
      const externalId = item.id;
      const publishedAtRaw = item.snippet?.publishedAt;
      const duration = parseDurationToSeconds(item.contentDetails?.duration ?? "");
      if (!externalId || !publishedAtRaw) continue;
      const publishedAt = new Date(publishedAtRaw);
      if (Number.isNaN(publishedAt.getTime())) continue;
      if (duration <= 0 || duration > MAX_COMPETITOR_VIDEO_DURATION_SECONDS) continue;

      const views = Number(item.statistics?.viewCount ?? 0);
      const likes = Number(item.statistics?.likeCount ?? 0);
      const comments = Number(item.statistics?.commentCount ?? 0);
      const title = item.snippet?.title ?? externalId;
      const description = item.snippet?.description ?? null;
      const thumbnailUrl =
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.medium?.url ??
        item.snippet?.thumbnails?.default?.url ??
        null;

      const rating = computeUniversalVideoRating({
        views,
        likes,
        comments,
        shares: 0,
        publishedAt,
        now,
        followerCount: null,
        retentionRate: null,
      });
      const score = Math.max(1, Math.min(99, rating));
      const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0;

      await prisma.competitorVideo.upsert({
        where: {
          competitorId_platform_externalId: {
            competitorId,
            platform: "youtube",
            externalId,
          },
        },
        create: {
          competitorId,
          platform: "youtube",
          externalId,
          url: `https://www.youtube.com/watch?v=${externalId}`,
          title,
          description,
          thumbnailUrl,
          publishedAt,
          durationSeconds: duration,
          views,
          likes,
          comments,
          score,
          viralScore: 0,
          viewsPerHour: 0,
          engagementRate,
          lastFetchedAt: now,
        },
        update: {
          title,
          description,
          thumbnailUrl,
          publishedAt,
          durationSeconds: duration,
          views,
          likes,
          comments,
          score,
          engagementRate,
          lastFetchedAt: now,
        },
      });
      videosTouched++;
    }

    await prisma.competitorAccount.update({
      where: { id: competitorId },
      data: { lastSyncedAt: new Date() },
    });

    return { ok: true, videosTouched };
  } catch (e) {
    return {
      ok: false,
      videosTouched: 0,
      errorShort: e instanceof Error ? e.message.slice(0, 120) : "youtube_error",
    };
  }
}
