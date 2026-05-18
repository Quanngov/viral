import { Prisma } from "@prisma/client";
import { compactErrorMeta, logAdminEvent, safeMeta } from "@/lib/admin-events";
import { prisma } from "@/lib/prisma";
import { throttledDetectTrends } from "@/lib/trends/throttled-detector";
import {
  COMPETITOR_DAILY_SYNC_TOKEN_COST,
  DAILY_SYNC_DEFAULT_VISIBLE_VIDEO_LIMIT,
  DAILY_SYNC_INITIAL_PROFILE_CAP,
  DAILY_SYNC_MORE_PROFILE_CAP,
} from "@/lib/competitor-daily-sync-config";
import { syncInstagramCompetitorReelsDailyOnePage } from "@/lib/competitor-instagram-reels-sync";
import { syncYouTubeCompetitorDailyShallow } from "@/lib/competitor-youtube-daily";
import { getTokenBalanceForUser, spendTokens } from "@/lib/token-wallet";

export function utcSyncDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export type DailySyncAction = "initial" | "more";

export type RunCompetitorDailySyncParams = {
  userId: string;
  sessionKey: string;
  action: DailySyncAction;
  visibleVideoLimit?: number;
};

export type RunCompetitorDailySyncResult = {
  ok: boolean;
  syncBlocked?: boolean;
  oldDataAllowed?: boolean;
  reason?: string;
  tokensRemaining?: number;
  chargedNewProfiles?: number;
  profilesSynced?: number;
};

function dailyMeta(p: {
  userId: string;
  sessionKey: string;
  competitorId?: string;
  platform?: string;
  username?: string | null;
  syncDate: string;
  chargedTokens?: number;
  action: DailySyncAction;
  reason?: string;
}) {
  return safeMeta({
    userId: p.userId,
    sessionId: p.sessionKey,
    competitorId: p.competitorId,
    platform: p.platform,
    username: p.username,
    syncDate: p.syncDate,
    chargedTokens: p.chargedTokens,
    action: p.action,
    reason: p.reason,
  });
}

async function chargeMissingDailyRows(opts: {
  userId: string;
  sessionKey: string;
  syncDate: string;
  competitors: { id: string; platform: string; username: string | null; displayName: string | null }[];
}): Promise<{ ok: true; created: number } | { ok: false; reason: "not_enough_tokens"; balance: number }> {
  const { userId, sessionKey, syncDate, competitors } = opts;
  let created = 0;
  if (competitors.length === 0) return { ok: true, created: 0 };

  const existing = await prisma.competitorDailySync.findMany({
    where: { userId, syncDate, competitorId: { in: competitors.map((c) => c.id) } },
    select: { competitorId: true },
  });
  const have = new Set(existing.map((e) => e.competitorId));
  const missing = competitors.filter((c) => !have.has(c.id));
  if (missing.length === 0) return { ok: true, created: 0 };

  const balance = await getTokenBalanceForUser(userId);
  const need = missing.length * COMPETITOR_DAILY_SYNC_TOKEN_COST;
  if (balance < need) {
    await logAdminEvent({
      level: "error",
      type: "competitor_daily_charge_failed",
      message: "Дневной учёт: недостаточно токенов для всех профилей",
      sessionId: sessionKey,
      userId,
      meta: dailyMeta({
        userId,
        sessionKey,
        syncDate,
        action: "initial",
        reason: "not_enough_tokens",
        chargedTokens: COMPETITOR_DAILY_SYNC_TOKEN_COST,
      }),
    });
    return { ok: false, reason: "not_enough_tokens", balance };
  }

  for (const c of missing) {
    const dup = await prisma.competitorDailySync.findUnique({
      where: {
        userId_competitorId_syncDate: { userId, competitorId: c.id, syncDate },
      },
    });
    if (dup) continue;

    await logAdminEvent({
      level: "info",
      type: "competitor_daily_charge_attempt",
      message: "Дневной учёт: попытка списания за профиль",
      sessionId: sessionKey,
      userId,
      meta: dailyMeta({
        userId,
        sessionKey,
        competitorId: c.id,
        platform: c.platform,
        username: c.username ?? c.displayName,
        syncDate,
        action: "initial",
        chargedTokens: COMPETITOR_DAILY_SYNC_TOKEN_COST,
      }),
    });

    const spend = await spendTokens(userId, COMPETITOR_DAILY_SYNC_TOKEN_COST, "competitor_daily_sync", {
      sessionId: sessionKey,
    });
    if (!spend.ok) {
      await logAdminEvent({
        level: "error",
        type: "competitor_daily_charge_failed",
        message: "Дневной учёт: списание не удалось",
        sessionId: sessionKey,
        userId,
        meta: dailyMeta({
          userId,
          sessionKey,
          competitorId: c.id,
          platform: c.platform,
          username: c.username ?? c.displayName,
          syncDate,
          action: "initial",
          reason: "not_enough_tokens",
        }),
      });
      return { ok: false, reason: "not_enough_tokens", balance: spend.balance };
    }

    try {
      await prisma.competitorDailySync.create({
        data: {
          userId,
          competitorId: c.id,
          syncDate,
          chargedTokens: COMPETITOR_DAILY_SYNC_TOKEN_COST,
          chargedAt: new Date(),
          status: "paid_pending",
        },
      });
      created++;
    } catch (e) {
      const code = e instanceof Prisma.PrismaClientKnownRequestError ? e.code : "";
      if (code === "P2002") {
        await logAdminEvent({
          level: "info",
          type: "competitor_daily_sync_skipped",
          message: "Дневной учёт: запись уже существует (гонка)",
          sessionId: sessionKey,
          userId,
          meta: dailyMeta({
            userId,
            sessionKey,
            competitorId: c.id,
            platform: c.platform,
            syncDate,
            action: "initial",
            reason: "duplicate_row",
          }),
        });
        continue;
      }
      throw e;
    }

    await logAdminEvent({
      level: "info",
      type: "competitor_daily_charge_success",
      message: "Дневной учёт: списание за профиль выполнено",
      sessionId: sessionKey,
      userId,
      meta: dailyMeta({
        userId,
        sessionKey,
        competitorId: c.id,
        platform: c.platform,
        username: c.username ?? c.displayName,
        syncDate,
        chargedTokens: COMPETITOR_DAILY_SYNC_TOKEN_COST,
        action: "initial",
      }),
    });
  }

  return { ok: true, created };
}

async function markSyncRow(
  userId: string,
  competitorId: string,
  syncDate: string,
  patch: { status: string; syncedAt?: Date | null; error?: string | null },
) {
  await prisma.competitorDailySync.updateMany({
    where: { userId, competitorId, syncDate },
    data: patch,
  });
}

async function runOneCompetitorExternalSync(opts: {
  account: {
    id: string;
    platform: string;
    username: string | null;
    handle: string | null;
    uploadsPlaylistId: string | null;
  };
  userId: string;
  sessionKey: string;
  syncDate: string;
  action: DailySyncAction;
}): Promise<void> {
  const { account, userId, sessionKey, syncDate, action } = opts;
  const uname = account.username ?? account.handle ?? "";

  await logAdminEvent({
    level: "info",
    type: "competitor_daily_sync_start",
    message: "Дневной синк профиля",
    sessionId: sessionKey,
    userId,
    meta: dailyMeta({
      userId,
      sessionKey,
      competitorId: account.id,
      platform: account.platform,
      username: uname,
      syncDate,
      action,
    }),
  });

  try {
    if (account.platform === "instagram") {
      if (!process.env.TIKHUB_TOKEN?.trim()) {
        await markSyncRow(userId, account.id, syncDate, {
          status: "failed",
          syncedAt: null,
          error: "tikhub_unconfigured",
        });
        await logAdminEvent({
          level: "error",
          type: "competitor_daily_sync_failed",
          message: "Instagram daily: TikHub не настроен",
          sessionId: sessionKey,
          userId,
          meta: dailyMeta({
            userId,
            sessionKey,
            competitorId: account.id,
            platform: account.platform,
            username: uname,
            syncDate,
            action,
            reason: "tikhub_unconfigured",
          }),
        });
        return;
      }
      const ig = await syncInstagramCompetitorReelsDailyOnePage({
        competitorId: account.id,
        username: uname || account.id,
      });
      if (!ig.ok) {
        await markSyncRow(userId, account.id, syncDate, {
          status: "failed",
          error: ig.errorShort ?? "sync_failed",
        });
        await logAdminEvent({
          level: "error",
          type: "competitor_daily_sync_failed",
          message: "Instagram daily: ошибка TikHub",
          sessionId: sessionKey,
          userId,
          meta: dailyMeta({
            userId,
            sessionKey,
            competitorId: account.id,
            platform: account.platform,
            username: uname,
            syncDate,
            action,
            reason: ig.errorShort,
          }),
        });
        return;
      }
    } else if (account.platform === "youtube") {
      const apiKey = process.env.YOUTUBE_API_KEY?.trim();
      if (!apiKey || !account.uploadsPlaylistId) {
        await markSyncRow(userId, account.id, syncDate, {
          status: "failed",
          error: apiKey ? "no_playlist" : "youtube_unconfigured",
        });
        await logAdminEvent({
          level: "error",
          type: "competitor_daily_sync_failed",
          message: "YouTube daily: нет ключа или плейлиста",
          sessionId: sessionKey,
          userId,
          meta: dailyMeta({
            userId,
            sessionKey,
            competitorId: account.id,
            platform: account.platform,
            username: uname,
            syncDate,
            action,
            reason: apiKey ? "no_playlist" : "youtube_unconfigured",
          }),
        });
        return;
      }
      const yt = await syncYouTubeCompetitorDailyShallow({
        competitorId: account.id,
        uploadsPlaylistId: account.uploadsPlaylistId,
        apiKey,
      });
      if (!yt.ok) {
        await markSyncRow(userId, account.id, syncDate, {
          status: "failed",
          error: yt.errorShort ?? "youtube_failed",
        });
        await logAdminEvent({
          level: "error",
          type: "competitor_daily_sync_failed",
          message: "YouTube daily: ошибка API",
          sessionId: sessionKey,
          userId,
          meta: dailyMeta({
            userId,
            sessionKey,
            competitorId: account.id,
            platform: account.platform,
            username: uname,
            syncDate,
            action,
            reason: yt.errorShort,
          }),
        });
        return;
      }
    } else {
      await markSyncRow(userId, account.id, syncDate, { status: "synced", syncedAt: new Date(), error: null });
      await logAdminEvent({
        level: "info",
        type: "competitor_daily_sync_skipped",
        message: "Платформа не поддерживается для дневного синка",
        sessionId: sessionKey,
        userId,
        meta: dailyMeta({
          userId,
          sessionKey,
          competitorId: account.id,
          platform: account.platform,
          username: uname,
          syncDate,
          action,
          reason: "unsupported_platform",
        }),
      });
      return;
    }

    await markSyncRow(userId, account.id, syncDate, { status: "synced", syncedAt: new Date(), error: null });
    await logAdminEvent({
      level: "info",
      type: "competitor_daily_sync_success",
      message: "Дневной синк профиля завершён",
      sessionId: sessionKey,
      userId,
      meta: dailyMeta({
        userId,
        sessionKey,
        competitorId: account.id,
        platform: account.platform,
        username: uname,
        syncDate,
        action,
      }),
    });
  } catch (e) {
    await markSyncRow(userId, account.id, syncDate, {
      status: "failed",
      error: e instanceof Error ? e.message.slice(0, 200) : "exception",
    });
    await logAdminEvent({
      level: "error",
      type: "competitor_daily_sync_failed",
      message: "Дневной синк: исключение",
      sessionId: sessionKey,
      userId,
      meta: {
        ...(dailyMeta({
          userId,
          sessionKey,
          competitorId: account.id,
          platform: account.platform,
          username: uname,
          syncDate,
          action,
        }) as object),
        ...compactErrorMeta(e),
      },
    });
  }
}

function orderedUniqueIds(ids: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export async function runCompetitorDailySync(
  params: RunCompetitorDailySyncParams,
): Promise<RunCompetitorDailySyncResult> {
  const { userId, sessionKey, action } = params;
  const visibleLimit = Math.min(
    100,
    Math.max(8, params.visibleVideoLimit ?? DAILY_SYNC_DEFAULT_VISIBLE_VIDEO_LIMIT),
  );
  const syncDate = utcSyncDateString();
  let tokensRemaining = await getTokenBalanceForUser(userId);

  const competitors = await prisma.competitorAccount.findMany({
    where: { userId },
    orderBy: { addedAt: "asc" },
    select: {
      id: true,
      platform: true,
      username: true,
      handle: true,
      displayName: true,
      uploadsPlaylistId: true,
    },
  });

  if (competitors.length === 0) {
    return { ok: true, tokensRemaining, chargedNewProfiles: 0, profilesSynced: 0 };
  }

  let chargedNewProfiles = 0;
  if (action === "initial") {
    const charged = await chargeMissingDailyRows({ userId, sessionKey, syncDate, competitors });
    if (!charged.ok) {
      return {
        ok: true,
        syncBlocked: true,
        oldDataAllowed: true,
        reason: "not_enough_tokens",
        tokensRemaining: charged.balance,
        chargedNewProfiles: 0,
        profilesSynced: 0,
      };
    }
    chargedNewProfiles = charged.created;
  }

  const pendingRows = await prisma.competitorDailySync.findMany({
    where: {
      userId,
      syncDate,
      status: "paid_pending",
      syncedAt: null,
    },
    orderBy: { chargedAt: "asc" },
    select: { competitorId: true },
  });
  const pendingSet = new Set(pendingRows.map((r) => r.competitorId));

  if (pendingSet.size === 0) {
    await logAdminEvent({
      level: "info",
      type: "competitor_daily_sync_skipped",
      message: "Дневной синк: все профили уже обработаны сегодня",
      sessionId: sessionKey,
      userId,
      meta: dailyMeta({ userId, sessionKey, syncDate, action, reason: "all_done" }),
    });
    tokensRemaining = await getTokenBalanceForUser(userId);
    return {
      ok: true,
      tokensRemaining,
      chargedNewProfiles: action === "initial" ? chargedNewProfiles : 0,
      profilesSynced: 0,
    };
  }

  let targetIds: string[] = [];

  if (action === "initial") {
    const topVideos = await prisma.competitorVideo.findMany({
      where: { competitor: { userId } },
      orderBy: { publishedAt: "desc" },
      take: visibleLimit,
      select: { competitorId: true },
    });
    const fromVideos = orderedUniqueIds(topVideos.map((v) => v.competitorId));
    targetIds = fromVideos.filter((id) => pendingSet.has(id)).slice(0, DAILY_SYNC_INITIAL_PROFILE_CAP);
    if (targetIds.length === 0) {
      targetIds = pendingRows.map((r) => r.competitorId).slice(0, DAILY_SYNC_INITIAL_PROFILE_CAP);
    }
  } else {
    targetIds = pendingRows.map((r) => r.competitorId).slice(0, DAILY_SYNC_MORE_PROFILE_CAP);
  }

  const byId = new Map(competitors.map((c) => [c.id, c]));
  let profilesSynced = 0;
  for (const id of targetIds) {
    const acc = byId.get(id);
    if (!acc) continue;
    await runOneCompetitorExternalSync({
      account: acc,
      userId,
      sessionKey,
      syncDate,
      action,
    });
    profilesSynced++;
  }

  tokensRemaining = await getTokenBalanceForUser(userId);

  // Запускаем детектор трендов в фоне если синхронизировались профили
  if (profilesSynced > 0) {
    throttledDetectTrends("competitor_sync").catch((error) => {
      console.error("Background trend detection after competitor sync failed:", error);
    });
  }

  return {
    ok: true,
    tokensRemaining,
    chargedNewProfiles: action === "initial" ? chargedNewProfiles : 0,
    profilesSynced,
  };
}
