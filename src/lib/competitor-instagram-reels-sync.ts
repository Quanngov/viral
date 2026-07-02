import { logAdminEvent, safeMeta, compactErrorMeta } from "@/lib/admin-events";
import { prisma } from "@/lib/prisma";
import type { NormalizedInstagramReel } from "@/lib/providers/tikhubInstagram";
import {
  fetchInstagramUserReelsTikHubPageForCompetitor,
  TIMEOUT_MS_INSTAGRAM_USER_REELS,
} from "@/lib/providers/tikhubInstagram";
import { computeUniversalVideoRating } from "@/lib/rating";

const MAX_INSTAGRAM_TIKHUB_PAGES = 3;
const TIKHUB_TIMEOUT_WARNING_RU = "TikHub не успел ответить, попробуйте добавить конкурента позже";

function pickBestAvatarFromReels(reels: NormalizedInstagramReel[]): string | null {
  for (const reel of reels) {
    const u = reel.authorAvatarUrl?.trim();
    if (u) return u;
  }
  return null;
}

async function upsertCompetitorVideoFromInstagramReel(
  competitorId: string,
  reel: NormalizedInstagramReel,
): Promise<void> {
  if (!reel.thumbnailUrl?.trim()) return;
  const now = new Date();
  const rating = computeUniversalVideoRating({
    views: reel.views,
    likes: reel.likes,
    comments: reel.comments,
    shares: reel.shares,
    publishedAt: reel.publishedAt,
    now,
    followerCount: reel.followerCount,
    retentionRate: null,
  });
  const score = Math.max(1, Math.min(99, rating));
  const durationSeconds = Math.max(0, Math.round(reel.durationSeconds));
  const engagementRate = reel.views > 0 ? ((reel.likes + reel.comments) / reel.views) * 100 : 0;

  await prisma.competitorVideo.upsert({
    where: {
      competitorId_platform_externalId: {
        competitorId,
        platform: "instagram",
        externalId: reel.externalId,
      },
    },
    create: {
      competitorId,
      platform: "instagram",
      externalId: reel.externalId,
      url: reel.url,
      title: reel.title,
      description: reel.description,
      thumbnailUrl: reel.thumbnailUrl,
      videoUrl: reel.videoUrl,
      subtitlesUrl: reel.subtitlesUrl,
      usefulRaw: reel.usefulRaw,
      publishedAt: reel.publishedAt,
      durationSeconds,
      views: reel.views,
      likes: reel.likes,
      comments: reel.comments,
      shares: reel.shares,
      authorUsername: reel.authorUsername,
      authorDisplayName: reel.authorDisplayName,
      authorAvatarUrl: reel.authorAvatarUrl,
      score,
      viralScore: 0,
      viewsPerHour: 0,
      engagementRate,
      lastFetchedAt: now,
    },
    update: {
      competitorId,
      title: reel.title,
      description: reel.description,
      thumbnailUrl: reel.thumbnailUrl,
      videoUrl: reel.videoUrl ?? undefined,
      subtitlesUrl: reel.subtitlesUrl ?? undefined,
      usefulRaw: reel.usefulRaw ?? undefined,
      publishedAt: reel.publishedAt,
      durationSeconds,
      views: reel.views,
      likes: reel.likes,
      comments: reel.comments,
      shares: reel.shares,
      authorUsername: reel.authorUsername ?? undefined,
      authorDisplayName: reel.authorDisplayName ?? undefined,
      authorAvatarUrl: reel.authorAvatarUrl ?? undefined,
      score,
      engagementRate,
      lastFetchedAt: now,
    },
  });
}

export type InstagramCompetitorReelsSyncResult = {
  videosLoaded: number;
  successfulPages: number;
  warnings: string[];
  /** Была ошибка загрузки (сеть, TikHub, исключение), а не просто пустой ответ */
  reelsFetchFailed: boolean;
};

/**
 * До 3 страниц fetch_user_reels + сохранение в CompetitorVideo.
 * Логирует tikhub_competitor_fetch_page на каждую попытку (1–2) с page, attempt, timeoutMs, …
 */
export async function syncInstagramCompetitorReelsFromTikHub(opts: {
  competitorId: string;
  username: string;
  userId: string;
  sessionKey: string;
}): Promise<InstagramCompetitorReelsSyncResult> {
  const { competitorId, username, userId, sessionKey } = opts;
  const externalId = username.toLowerCase();

  const warnings: string[] = [];
  let videosLoaded = 0;
  let cursor: string | null = null;
  let successfulPages = 0;
  let lastPaginationWhenStoppedMax: string | null = null;
  let stoppedAtMaxPages = false;
  let reelsFetchFailed = false;
  let bestAvatarUrl: string | null = null;

  for (let pageNum = 1; pageNum <= MAX_INSTAGRAM_TIKHUB_PAGES; pageNum++) {
    let page;
    try {
      page = await fetchInstagramUserReelsTikHubPageForCompetitor(externalId, cursor, async (info) => {
        await logAdminEvent({
          level: info.result.ok ? "info" : "warn",
          type: "tikhub_competitor_fetch_page",
          message: `TikHub fetch_user_reels · страница ${pageNum} · попытка ${info.attempt}`,
          sessionId: sessionKey,
          userId,
          meta: safeMeta({
            page: pageNum,
            attempt: info.attempt,
            timeoutMs: info.timeoutMs,
            httpStatus: info.result.httpStatus,
            errorKind: info.result.errorKind,
            username: externalId,
            reelsOnPage: info.result.ok ? info.result.reels.length : 0,
          }),
        });
      });
    } catch (e) {
      reelsFetchFailed = true;
      await logAdminEvent({
        level: "error",
        type: "competitor_add_error",
        message: "Исключение при запросе TikHub",
        sessionId: sessionKey,
        userId,
        meta: safeMeta({
          phase: "tikhub_fetch",
          page: pageNum,
          username: externalId,
          timeoutMs: TIMEOUT_MS_INSTAGRAM_USER_REELS,
          ...compactErrorMeta(e),
        }),
      });
      warnings.push("Ошибка сети при загрузке роликов из TikHub.");
      break;
    }

    if (!page.ok) {
      reelsFetchFailed = true;
      if (page.errorKind === "timeout" || page.httpStatus === 408) {
        warnings.push(TIKHUB_TIMEOUT_WARNING_RU);
      } else {
        warnings.push(
          page.errorKind
            ? `Не удалось получить ролики (код: ${page.errorKind}).`
            : "Не удалось получить ролики из TikHub.",
        );
      }
      break;
    }

    successfulPages++;
    const fromPage = pickBestAvatarFromReels(page.reels);
    if (fromPage) bestAvatarUrl = fromPage;
    for (const reel of page.reels) {
      try {
        await upsertCompetitorVideoFromInstagramReel(competitorId, reel);
        videosLoaded++;
      } catch (e) {
        await logAdminEvent({
          level: "error",
          type: "competitor_add_error",
          message: "Ошибка сохранения ролика конкурента",
          sessionId: sessionKey,
          userId,
          meta: safeMeta({
            phase: "save_reel",
            username: externalId,
            reelId: reel.externalId,
            ...compactErrorMeta(e),
          }),
        });
        warnings.push("Часть роликов не удалось сохранить.");
      }
    }

    if (!page.paginationToken) {
      lastPaginationWhenStoppedMax = null;
      break;
    }
    if (pageNum === MAX_INSTAGRAM_TIKHUB_PAGES) {
      lastPaginationWhenStoppedMax = page.paginationToken;
      stoppedAtMaxPages = true;
      break;
    }
    cursor = page.paginationToken;
  }

  const persistPagination = stoppedAtMaxPages && Boolean(lastPaginationWhenStoppedMax);

  const updateData: { lastSyncedAt: Date; lastReelsPaginationToken: string | null; avatarUrl?: string } = {
    lastSyncedAt: new Date(),
    lastReelsPaginationToken: persistPagination ? lastPaginationWhenStoppedMax : null,
  };
  if (bestAvatarUrl) {
    updateData.avatarUrl = bestAvatarUrl;
  }

  await prisma.competitorAccount.update({
    where: { id: competitorId },
    data: updateData,
  });

  await logAdminEvent({
    level: "info",
    type: "tikhub_competitor_fetch_done",
    message: "TikHub: цикл загрузки страниц конкурента завершён",
    sessionId: sessionKey,
    userId,
    meta: safeMeta({
      username: externalId,
      successfulPages,
      videosLoaded,
      savedPaginationCursor: persistPagination,
    }),
  });

  await logAdminEvent({
    level: "info",
    type: "competitor_videos_saved",
    message: "Ролики Instagram-конкурента обработаны",
    sessionId: sessionKey,
    userId,
    meta: safeMeta({
      competitorId,
      videosLoaded,
      username: externalId,
    }),
  });

  return {
    videosLoaded,
    successfulPages,
    warnings,
    reelsFetchFailed,
  };
}

export type InstagramDailyShallowResult = {
  ok: boolean;
  reelsProcessed: number;
  errorShort?: string;
};

/** Одна страница TikHub для дневного обновления (без глубокой догрузки). */
export async function syncInstagramCompetitorReelsDailyOnePage(opts: {
  competitorId: string;
  username: string;
}): Promise<InstagramDailyShallowResult> {
  const { competitorId, username } = opts;
  const externalId = username.toLowerCase();

  let page;
  try {
    page = await fetchInstagramUserReelsTikHubPageForCompetitor(externalId, null, undefined);
  } catch (e) {
    return {
      ok: false,
      reelsProcessed: 0,
      errorShort: e instanceof Error ? e.message.slice(0, 120) : "fetch_error",
    };
  }

  if (!page.ok) {
    const short =
      page.errorKind === "timeout" || page.httpStatus === 408
        ? "timeout"
        : page.errorKind?.slice(0, 80) ?? `http_${page.httpStatus}`;
    return { ok: false, reelsProcessed: 0, errorShort: short };
  }

  const bestAvatarUrl = pickBestAvatarFromReels(page.reels);
  let reelsProcessed = 0;
  for (const reel of page.reels) {
    try {
      await upsertCompetitorVideoFromInstagramReel(competitorId, reel);
      reelsProcessed++;
    } catch {
      // продолжаем остальные ролики
    }
  }

  const updateData: { lastSyncedAt: Date; avatarUrl?: string } = {
    lastSyncedAt: new Date(),
  };
  if (bestAvatarUrl) updateData.avatarUrl = bestAvatarUrl;

  await prisma.competitorAccount.update({
    where: { id: competitorId },
    data: updateData,
  });

  return { ok: true, reelsProcessed };
}