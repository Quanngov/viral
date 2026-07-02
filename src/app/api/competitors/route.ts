import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { detectCompetitorPlatform } from "@/lib/competitor-input";
import { logAdminEvent, safeMeta } from "@/lib/admin-events";
import { prisma } from "@/lib/prisma";
import { syncInstagramCompetitorReelsFromTikHub } from "@/lib/competitor-instagram-reels-sync";
import { assertCompetitorAddAllowed } from "@/lib/billing/billing-service";
import { getActionTokenCost } from "@/lib/billing/billing.config";
import { ensureSessionUser, getTokenBalanceForUser, spendTokens } from "@/lib/token-wallet";
import { hasResolvableThumbnail } from "@/lib/video-thumbnail";
import { parseDurationToSeconds } from "@/lib/youtube";

export const dynamic = "force-dynamic";
const YT_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_COMPETITOR_VIDEO_DURATION_SECONDS = 60;
const ADD_COMPETITOR_COST = getActionTokenCost("ADD_COMPETITOR");

type YtChannelItem = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
  };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
};

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

export const GET = withApiRoute("competitors.GET", async () => {
  const { userId } = await ensureSessionUser();
  const competitors = await prisma.competitorAccount.findMany({
    where: { userId },
    orderBy: [{ addedAt: "desc" }],
  });
  return NextResponse.json({ competitors });
});

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    url?: string;
    username?: string;
    platform?: "youtube" | "instagram" | "tiktok";
    profileUrl?: string;
    avatarUrl?: string;
    displayName?: string;
    description?: string;
  };
  console.log("[competitors] input", body);

  const candidateInput = (body.url ?? body.username ?? "").trim();
  const detection = detectCompetitorPlatform(candidateInput);
  if (!detection.platform || !detection.username || !detection.profileUrl) {
    return NextResponse.json({ error: "invalid_input", message: detection.error }, { status: 400 });
  }

  if (body.platform && body.platform !== detection.platform) {
    return NextResponse.json({ error: "platform_mismatch" }, { status: 400 });
  }

  const platform = detection.platform;
  const username = detection.username;

  if (platform === "instagram") {
    const externalId = username.toLowerCase();
    const { userId, sessionKey } = await ensureSessionUser();

    const slot = await assertCompetitorAddAllowed({
      userId,
      platform: "instagram",
      externalId,
    });
    if (!slot.ok) {
      return NextResponse.json(
        { error: slot.error, message: slot.message },
        { status: slot.status },
      );
    }
    const alreadyMine = slot.alreadyMine;

    await logAdminEvent({
      level: "info",
      type: "competitor_add_start",
      message: "Добавление Instagram-конкурента",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({ platform: "instagram", username: externalId }),
    });

    if (!process.env.TIKHUB_TOKEN?.trim()) {
      await logAdminEvent({
        level: "error",
        type: "competitor_add_error",
        message: "TikHub не настроен (нет TIKHUB_TOKEN)",
        sessionId: sessionKey,
        userId,
        meta: safeMeta({ phase: "config", platform: "instagram" }),
      });
      return NextResponse.json(
        {
          ok: false,
          error: "tikhub_unconfigured",
          message: "TikHub не настроен. Задайте TIKHUB_TOKEN в .env",
        },
        { status: 503 },
      );
    }

    let tokensRemaining = await getTokenBalanceForUser(userId);
    if (!alreadyMine) {
      const spend = await spendTokens(userId, ADD_COMPETITOR_COST, "competitor_instagram_add", {
        sessionId: sessionKey,
      });
      tokensRemaining = spend.balance;
      if (!spend.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: "insufficient_tokens",
            tokensOk: false,
            tokensRemaining: spend.balance,
            message: `Недостаточно токенов для добавления конкурента (нужно ${ADD_COMPETITOR_COST}).`,
          },
          { status: 402 },
        );
      }
      await logAdminEvent({
        level: "info",
        type: "competitor_token_spend",
        message: "Списание токенов за добавление Instagram-конкурента",
        sessionId: sessionKey,
        userId,
        meta: safeMeta({
          amount: ADD_COMPETITOR_COST,
          balanceAfter: spend.balance,
          platform: "instagram",
          username: externalId,
        }),
      });
    }

    const competitor = await prisma.competitorAccount.upsert({
      where: {
        userId_platform_externalId: {
          userId,
          platform: "instagram",
          externalId,
        },
      },
      create: {
        userId,
        platform: "instagram",
        externalId,
        username: externalId,
        handle: externalId,
        displayName: body.displayName ?? externalId,
        profileUrl: body.profileUrl ?? `https://www.instagram.com/${externalId}/`,
        avatarUrl: body.avatarUrl ?? null,
        description: body.description ?? null,
      },
      update: {
        username: externalId,
        handle: externalId,
        displayName: body.displayName ?? externalId,
        profileUrl: body.profileUrl ?? `https://www.instagram.com/${externalId}/`,
        avatarUrl: body.avatarUrl ?? null,
        description: body.description ?? null,
      },
    });

    const syncResult = await syncInstagramCompetitorReelsFromTikHub({
      competitorId: competitor.id,
      username: externalId,
      userId,
      sessionKey,
    });

    let message: string;
    if (syncResult.videosLoaded > 0) {
      message = `Конкурент добавлен, загружено ${syncResult.videosLoaded} роликов`;
    } else if (syncResult.reelsFetchFailed) {
      message = "Конкурент добавлен, но ролики не загрузились. Попробуйте обновить позже.";
    } else {
      message = "Конкурент добавлен, но ролики пока не найдены";
    }

    const fresh = await prisma.competitorAccount.findUnique({ where: { id: competitor.id } });

    return NextResponse.json(
      {
        ok: true,
        competitor: fresh ?? competitor,
        videosSaved: syncResult.videosLoaded,
        videosUpdated: 0,
        rawVideos: syncResult.videosLoaded,
        detailsFetched: syncResult.successfulPages,
        shortsFound: syncResult.videosLoaded,
        uploadsPlaylistId: null,
        tokensRemaining,
        message,
        warning: syncResult.warnings.length ? [...new Set(syncResult.warnings)].join(" ") : undefined,
      },
      { status: 201 },
    );
  }

  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_api_key", message: "Задайте YOUTUBE_API_KEY в .env" },
      { status: 503 },
    );
  }

  const normalized = detection.normalizedInput;
  const channelId = /^UC[\w-]{8,}$/i.test(normalized) ? normalized : null;
  const handle = channelId ? null : normalized.replace(/^@/, "").toLowerCase();
  console.log("[competitors] parsed", { platform, handle, channelId });

  let channel: YtChannelItem | null = null;
  if (channelId) {
    const data = await ytFetch<{ items?: YtChannelItem[] }>(
      "channels",
      {
        part: "snippet,contentDetails,statistics",
        id: channelId,
      },
      apiKey,
    );
    channel = data.items?.[0] ?? null;
  } else if (handle) {
    const byHandle = await ytFetch<{ items?: YtChannelItem[] }>(
      "channels",
      {
        part: "snippet,contentDetails,statistics",
        forHandle: `@${handle}`,
      },
      apiKey,
    );
    channel = byHandle.items?.[0] ?? null;
    if (!channel) {
      const search = await ytFetch<{ items?: { id?: { channelId?: string } }[] }>(
        "search",
        {
          part: "snippet",
          type: "channel",
          q: handle,
          maxResults: "1",
        },
        apiKey,
      );
      const fallbackChannelId = search.items?.[0]?.id?.channelId;
      if (fallbackChannelId) {
        const byId = await ytFetch<{ items?: YtChannelItem[] }>(
          "channels",
          {
            part: "snippet,contentDetails,statistics",
            id: fallbackChannelId,
          },
          apiKey,
        );
        channel = byId.items?.[0] ?? null;
      }
    }
  }

  if (!channel?.id) {
    return NextResponse.json(
      { error: "channel_not_found", message: "Не удалось найти YouTube-канал" },
      { status: 404 },
    );
  }

  const resolvedChannelId = channel.id;
  const { userId } = await ensureSessionUser();

  const slot = await assertCompetitorAddAllowed({
    userId,
    platform: "youtube",
    externalId: resolvedChannelId,
  });
  if (!slot.ok) {
    return NextResponse.json({ error: slot.error, message: slot.message }, { status: slot.status });
  }
  const alreadyMine = slot.alreadyMine;

  let tokensRemaining = await getTokenBalanceForUser(userId);
  if (!alreadyMine) {
    const spend = await spendTokens(userId, ADD_COMPETITOR_COST, "competitor_youtube_add");
    tokensRemaining = spend.balance;
    if (!spend.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "insufficient_tokens",
          tokensRemaining: spend.balance,
          message: `Недостаточно токенов для добавления конкурента (нужно ${ADD_COMPETITOR_COST}).`,
        },
        { status: 402 },
      );
    }
  }

  const displayName = channel.snippet?.title ?? handle ?? resolvedChannelId;
  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads ?? null;
  console.log("[competitors] resolved channel", {
    channelId: resolvedChannelId,
    displayName,
    uploadsPlaylistId,
  });

  const thumb =
    channel.snippet?.thumbnails?.high?.url ??
    channel.snippet?.thumbnails?.medium?.url ??
    channel.snippet?.thumbnails?.default?.url ??
    null;

  const competitor = await prisma.competitorAccount.upsert({
    where: {
      userId_platform_externalId: {
        userId,
        platform: "youtube",
        externalId: resolvedChannelId,
      },
    },
    create: {
      userId,
      platform: "youtube",
      externalId: resolvedChannelId,
      username: handle ?? channel.snippet?.customUrl ?? resolvedChannelId,
      handle: handle ?? null,
      displayName,
      profileUrl: body.profileUrl ?? `https://www.youtube.com/channel/${resolvedChannelId}`,
      avatarUrl: body.avatarUrl ?? thumb,
      description: body.description ?? channel.snippet?.description ?? null,
      uploadsPlaylistId,
      lastSyncedAt: new Date(),
    },
    update: {
      username: handle ?? channel.snippet?.customUrl ?? resolvedChannelId,
      handle: handle ?? null,
      displayName,
      profileUrl: body.profileUrl ?? `https://www.youtube.com/channel/${resolvedChannelId}`,
      avatarUrl: body.avatarUrl ?? thumb,
      description: body.description ?? channel.snippet?.description ?? null,
      uploadsPlaylistId,
      lastSyncedAt: new Date(),
    },
  });

  let rawVideos = 0;
  let detailsFetched = 0;
  let shortsFound = 0;
  let videosSaved = 0;
  let videosUpdated = 0;

  if (uploadsPlaylistId) {
    const playlist = await ytFetch<{
      items?: { contentDetails?: { videoId?: string } }[];
    }>(
      "playlistItems",
      {
        part: "snippet,contentDetails",
        playlistId: uploadsPlaylistId,
        maxResults: "50",
      },
      apiKey,
    );
    rawVideos = playlist.items?.length ?? 0;
    const videoIds = (playlist.items ?? [])
      .map((i) => i.contentDetails?.videoId)
      .filter((v): v is string => Boolean(v));
    console.log("[competitors] playlist videoIds", videoIds.length);

    if (videoIds.length > 0) {
      const details = await ytFetch<{ items?: YtVideoItem[] }>(
        "videos",
        {
          part: "snippet,statistics,contentDetails",
          id: videoIds.join(","),
        },
        apiKey,
      );
      const rows = details.items ?? [];
      detailsFetched = rows.length;
      console.log("[competitors] details fetched", detailsFetched);

      const shorts = rows
        .map((item) => {
          const externalId = item.id;
          const publishedAtRaw = item.snippet?.publishedAt;
          const duration = parseDurationToSeconds(item.contentDetails?.duration ?? "");
          if (!externalId || !publishedAtRaw) return null;
          const publishedAt = new Date(publishedAtRaw);
          if (Number.isNaN(publishedAt.getTime())) return null;
          return {
            externalId,
            durationSeconds: duration,
            title: item.snippet?.title ?? externalId,
            description: item.snippet?.description ?? null,
            thumbnailUrl:
              item.snippet?.thumbnails?.high?.url ??
              item.snippet?.thumbnails?.medium?.url ??
              item.snippet?.thumbnails?.default?.url ??
              null,
            publishedAt,
            views: Number(item.statistics?.viewCount ?? 0),
            likes: Number(item.statistics?.likeCount ?? 0),
            comments: Number(item.statistics?.commentCount ?? 0),
          };
        })
        .filter((v): v is NonNullable<typeof v> => Boolean(v))
        .filter((v) => v.durationSeconds > 0 && v.durationSeconds <= MAX_COMPETITOR_VIDEO_DURATION_SECONDS);

      shortsFound = shorts.length;
      console.log("[competitors] shorts after filter", shortsFound);

      const existingIds = new Set(
        (
          await prisma.competitorVideo.findMany({
            where: {
              competitorId: competitor.id,
              platform: "youtube",
              externalId: { in: shorts.map((s) => s.externalId) },
            },
            select: { externalId: true },
          })
        ).map((v) => v.externalId),
      );

      for (const video of shorts) {
        if (!video.thumbnailUrl?.trim() && video.externalId) {
          video.thumbnailUrl = `https://i.ytimg.com/vi/${video.externalId}/hqdefault.jpg`;
        }
        if (!hasResolvableThumbnail("youtube", video.externalId, video.thumbnailUrl)) continue;
        const existed = existingIds.has(video.externalId);
        await prisma.competitorVideo.upsert({
          where: {
            competitorId_platform_externalId: {
              competitorId: competitor.id,
              platform: "youtube",
              externalId: video.externalId,
            },
          },
          create: {
            competitorId: competitor.id,
            platform: "youtube",
            externalId: video.externalId,
            url: `https://www.youtube.com/watch?v=${video.externalId}`,
            title: video.title,
            description: video.description,
            thumbnailUrl: video.thumbnailUrl,
            publishedAt: video.publishedAt,
            durationSeconds: video.durationSeconds,
            views: video.views,
            likes: video.likes,
            comments: video.comments,
            score: Math.max(1, Math.min(99, Math.round(video.views >= 1000 ? 70 : 40))),
            viralScore: 0,
            viewsPerHour: 0,
            engagementRate:
              video.views > 0 ? ((video.likes + video.comments) / video.views) * 100 : 0,
            lastFetchedAt: new Date(),
          },
          update: {
            competitorId: competitor.id,
            title: video.title,
            description: video.description,
            thumbnailUrl: video.thumbnailUrl,
            publishedAt: video.publishedAt,
            durationSeconds: video.durationSeconds,
            views: video.views,
            likes: video.likes,
            comments: video.comments,
            score: Math.max(1, Math.min(99, Math.round(video.views >= 1000 ? 70 : 40))),
            engagementRate:
              video.views > 0 ? ((video.likes + video.comments) / video.views) * 100 : 0,
            lastFetchedAt: new Date(),
          },
        });
        if (existed) videosUpdated += 1;
        else videosSaved += 1;
      }
      console.log("[competitors] saved/updated", { videosSaved, videosUpdated });
    }
  }

  const message =
    shortsFound === 0
      ? "Канал добавлен, но Shorts до 60 секунд среди последних 50 видео не найдено."
      : "YouTube-конкурент добавлен и ролики синхронизированы.";

  return NextResponse.json({
    ok: true,
    competitor,
    videosSaved,
    videosUpdated,
    rawVideos,
    detailsFetched,
    shortsFound,
    uploadsPlaylistId,
    tokensRemaining,
    message,
  });
}
