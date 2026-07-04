import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import type { Video } from "@prisma/client";
import { logAdminEvent, safeMeta } from "@/lib/admin-events";
import { USER_MSG } from "@/lib/api-user-messages";
import { prisma } from "@/lib/prisma";
import { buildFeedVideoPrismaWhere } from "@/lib/feed/build-feed-video-where";
import { videoMatchesFeedFilters, type FeedFilterPayload } from "@/lib/feed/feed-filters";
import { computeFeedVideoStats } from "@/lib/feed/feed-log-stats";
import { ingestYouTubeShortsForQuery } from "@/lib/feed/ingest-youtube";
import { upsertInstagramReelsFromTikHub } from "@/lib/feed/ingest-instagram";
import { searchInstagramReelsTikHub } from "@/lib/providers/tikhubInstagram";
import { SEARCH_BATCH, searchLocalVideos, SEARCH_EXPANSION_PERIOD } from "@/lib/feed/search-local";
import { pickFeedBatch } from "@/lib/smart-mix";
import { rankVideosForSearch } from "@/lib/search-ranking";
import { optimizeSearchQuery, tokenizeSearchQuery } from "@/lib/search-query-optimizer";
import { getActionTokenCost } from "@/lib/billing/billing.config";
import { ensureSessionUser, spendTokens } from "@/lib/token-wallet";
import { videoToClientJson } from "@/lib/serialize-video";
import { videoClientId } from "@/lib/video-client-id";
import { throttledDetectTrends } from "@/lib/trends/throttled-detector";
import { canMakeExternalSearch, markExternalSearchMade } from "@/lib/search-throttle";
import type { ApiSort, FeedPlatformMode, PeriodApi } from "@/lib/search-query";
import { filterVideosWithDisplayableThumbnail } from "@/lib/thumbnail-pipeline";
import { fillDisplayableFromPool } from "@/lib/grid-video-display";
import { hasResolvableThumbnail } from "@/lib/video-thumbnail";

export const dynamic = "force-dynamic";

const BATCH = SEARCH_BATCH;
const THRESH_MORE = 14;

type Body = {
  action?: string;
  q?: string;
  platform?: string;
  seenIds?: string[];
  batchIndex?: number;
  period?: PeriodApi;
  sort?: ApiSort;
  minViews?: number;
  languageMode?: "world" | "ru" | "en";
  region?: string;
  language?: string;
};

type PickRound = {
  picked: Video[];
  unseenCount: number;
  rowsDb: number;
  matchingCount: number;
  unseenInstagramInPool: number;
};

function parsePlatform(p: string | undefined): FeedPlatformMode {
  if (p === "youtube" || p === "instagram" || p === "all") return p;
  return "all";
}

function parseSort(s: string | undefined): ApiSort {
  const allowed: ApiSort[] = [
    "views_desc",
    "views_asc",
    "date_desc",
    "date_asc",
    "viral_desc",
    "viral_asc",
  ];
  if (s && allowed.includes(s as ApiSort)) return s as ApiSort;
  return "viral_desc";
}

function parsePeriod(s: string | undefined): PeriodApi {
  const allowed: PeriodApi[] = ["today", "yesterday", "week", "month", "year", "all"];
  if (s && allowed.includes(s as PeriodApi)) return s as PeriodApi;
  return "month";
}

type ExternalProvider = "youtube" | "instagram";

function pickExternalProvider(platform: FeedPlatformMode): ExternalProvider | null {
  const ytKey = Boolean(process.env.YOUTUBE_API_KEY?.trim());
  if (platform === "youtube") return ytKey ? "youtube" : null;
  if (platform === "instagram") return "instagram";
  if (ytKey) return "youtube";
  return "instagram";
}

async function runOneExternalSearch(args: {
  provider: ExternalProvider;
  q: string;
  region: string;
  language: string;
  period: PeriodApi;
  sort: ApiSort;
  minViews: number;
  sessionKey: string;
  userId: string;
}): Promise<{ saved: number; reelsFound?: number }> {
  if (args.provider === "youtube") {
    const apiKey = process.env.YOUTUBE_API_KEY?.trim();
    if (!apiKey) return { saved: 0 };
    const res = await ingestYouTubeShortsForQuery({
      q: args.q,
      apiKey,
      region: args.region,
      language: args.language,
      period: args.period,
      sort: args.sort,
      minViews: args.minViews,
    });
    return { saved: res.saved };
  }

  try {
    const ig = await searchInstagramReelsTikHub(args.q);
    if (!ig.reels.length) return { saved: 0, reelsFound: 0 };
    const n = await upsertInstagramReelsFromTikHub(ig.reels, args.q, ig.cacheUrl);
    return { saved: n, reelsFound: ig.reels.length };
  } catch (e) {
    await logAdminEvent({
      level: "error",
      type: "error",
      message: "Instagram upsert pipeline",
      sessionId: args.sessionKey,
      userId: args.userId,
      meta: safeMeta({
        provider: "tikhub_instagram",
        error: e instanceof Error ? { name: e.name, message: e.message } : String(e),
      }),
    });
    return { saved: 0, reelsFound: 0 };
  }
}

async function loadAndPickMore(args: {
  prismaWhere: Prisma.VideoWhereInput;
  filters: FeedFilterPayload;
  sort: ApiSort;
  seen: Set<string>;
  batchIndex: number;
  mixSeed: string;
  now: Date;
  searchQuery: string;
}): Promise<PickRound> {
  const rows = await prisma.video.findMany({
    where: args.prismaWhere,
    orderBy: [{ viralScore: "desc" }, { views: "desc" }, { rating: "desc" }],
    take: 900,
  });

  const matching = rows.filter((v) => videoMatchesFeedFilters(v, args.filters, args.now));
  const unseen = matching.filter((v) => !args.seen.has(videoClientId(v.platform, v.externalId)));
  const ranked = rankVideosForSearch(unseen, args.searchQuery, args.sort, args.now);

  const picked: Video[] = [];
  let batchIdx = args.batchIndex;
  while (picked.length < BATCH && batchIdx < args.batchIndex + 12) {
    const batch = pickFeedBatch(ranked, batchIdx, BATCH, {
      mode: "more",
      now: args.now,
      platformFilter: args.filters.platform,
      minViewsFloor: args.filters.minViews,
      mixSeed: args.mixSeed,
      sort: args.sort,
    });
    for (const v of batch) {
      if (picked.some((p) => p.id === v.id)) continue;
      picked.push(v);
      if (picked.length >= BATCH) break;
    }
    if (batch.length === 0) break;
    batchIdx += 1;
  }

  return {
    picked,
    unseenCount: unseen.length,
    rowsDb: rows.length,
    matchingCount: matching.length,
    unseenInstagramInPool: unseen.filter((v) => v.platform === "instagram").length,
  };
}

function serializePicked(picked: Video[]) {
  const displayable = filterVideosWithDisplayableThumbnail(picked);
  const asGrid = displayable.map(videoToClientJson);
  return fillDisplayableFromPool(asGrid, BATCH, (v) =>
    hasResolvableThumbnail(v.platform, v.externalId ?? v.youtubeId, v.thumbnailUrl, v.id),
  );
}

export async function POST(req: Request) {
  let body: Body = {};
  let feedUserHint: string | undefined;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const action = body.action === "more" ? "more" : "search";
  const userQuery = (body.q ?? "").trim();
  if (!userQuery) {
    return NextResponse.json({ error: "bad_request", message: "q обязателен" }, { status: 400 });
  }

  const { userId, sessionKey } = await ensureSessionUser();
  const cost = action === "more" ? getActionTokenCost("LOAD_MORE") : getActionTokenCost("SEARCH");

  const platform = parsePlatform(body.platform);
  const period = parsePeriod(body.period);
  const sort = parseSort(body.sort);
  const minViewsRaw = Number(body.minViews ?? 0);
  const minViews = Number.isFinite(minViewsRaw) ? Math.max(0, Math.floor(minViewsRaw)) : 0;
  const languageMode = body.languageMode === "ru" || body.languageMode === "en" ? body.languageMode : "world";
  const region = (body.region ?? "").trim();
  const language = (body.language ?? "").trim();

  const seen = new Set((body.seenIds ?? []).filter(Boolean));
  const batchIndex = Math.max(0, Math.floor(Number(body.batchIndex) || 0));
  const now = new Date();

  let optimized = await optimizeSearchQuery(userQuery);
  if (action === "more") {
    optimized = {
      userQuery,
      optimizedQuery: userQuery,
      terms: tokenizeSearchQuery(userQuery),
      relatedTerms: tokenizeSearchQuery(userQuery),
      source: "fallback",
    };
  }

  const filters: FeedFilterPayload = {
    q: optimized.optimizedQuery,
    period,
    minViews,
    languageMode,
    platform,
  };

  if (userQuery.length <= 120) {
    const normalizedQuery = userQuery.toLowerCase().replace(/\s+/g, " ").trim();
    if (normalizedQuery) {
      try {
        await prisma.searchQueryLog.create({
          data: {
            userId,
            query: userQuery,
            normalizedQuery,
            action,
            platform: body.platform || null,
          },
        });
      } catch (e) {
        await logAdminEvent({
          level: "warn",
          type: "search_log_error",
          message: "Failed to record search query log",
          sessionId: sessionKey,
          userId,
          meta: safeMeta({ error: e instanceof Error ? e.message : String(e) }),
        });
      }
    }
  }

  await logAdminEvent({
    level: "info",
    type: action === "more" ? "feed_more" : "feed_search",
    message: `Запрос ленты (${action})`,
    sessionId: sessionKey,
    userId,
    meta: safeMeta({
      action,
      userQuery,
      optimizedQuery: optimized.optimizedQuery,
      optimizerSource: optimized.source,
      platform,
      period,
      sort,
      minViews,
      languageMode,
      batchIndex,
      seenIdsCount: seen.size,
      tokenCost: cost,
    }),
  });

  let round: PickRound & { tierUsed?: string };

  if (action === "search") {
    round = await searchLocalVideos({
      optimizedQuery: optimized.optimizedQuery,
      terms: optimized.terms,
      relatedTerms: optimized.relatedTerms,
      filters,
      sort,
      seen,
      now,
      limit: BATCH,
    });
  } else {
    const prismaWhere = buildFeedVideoPrismaWhere({
      q: optimized.optimizedQuery,
      platform,
      minViews,
      period,
      now,
    });
    round = await loadAndPickMore({
      prismaWhere,
      filters,
      sort,
      seen,
      batchIndex,
      mixSeed: `${optimized.optimizedQuery}|${platform}|${sort}`,
      now,
      searchQuery: optimized.optimizedQuery,
    });
  }

  await logAdminEvent({
    level: "info",
    type: action === "more" ? "feed_more" : "feed_search",
    message: "Кандидаты из БД (первая выборка)",
    sessionId: sessionKey,
    userId,
    meta: safeMeta({
      rowsDb: round.rowsDb,
      matchingCount: round.matchingCount,
      unseenCount: round.unseenCount,
      unseenInstagramInPool: round.unseenInstagramInPool,
      pickedCount: round.picked.length,
      tierUsed: "tierUsed" in round ? round.tierUsed : undefined,
    }),
  });

  const lowPool = round.unseenCount < THRESH_MORE;
  const canExternal = await canMakeExternalSearch(optimized.optimizedQuery);

  const wantExternal =
    (action === "search" && round.picked.length < BATCH && canExternal) ||
    (action === "more" && lowPool && canExternal);

  const spendReason = action === "more" ? "feed_show_more" : "feed_search";
  const spend = await spendTokens(userId, cost, spendReason, { sessionId: sessionKey });
  if (!spend.ok) {
    return NextResponse.json(
      {
        tokensOk: false,
        tokensRemaining: spend.balance,
        videos: [],
        noMore: action === "more",
        message: USER_MSG.tokensInsufficient,
      },
      { status: 402 },
    );
  }

  let externalRan = false;
  if (wantExternal) {
    const provider = pickExternalProvider(platform);
    if (provider) {
      externalRan = true;
      await logAdminEvent({
        level: "info",
        type: "api_fetch",
        message: "Один внешний поиск",
        sessionId: sessionKey,
        userId,
        meta: safeMeta({ provider, q: optimized.optimizedQuery }),
      });

      const externalPeriod = action === "search" ? SEARCH_EXPANSION_PERIOD : period;

      const ext = await runOneExternalSearch({
        provider,
        q: optimized.optimizedQuery,
        region,
        language,
        period: externalPeriod,
        sort,
        minViews,
        sessionKey,
        userId,
      });

      if (action === "search" && ext.saved > 0) {
        await markExternalSearchMade(optimized.optimizedQuery);
      }

      await logAdminEvent({
        level: "info",
        type: "upsert",
        message: "После внешнего поиска",
        sessionId: sessionKey,
        userId,
        meta: safeMeta({ provider, saved: ext.saved, reelsFound: ext.reelsFound ?? 0 }),
      });

      if (action === "search") {
        round = await searchLocalVideos({
          optimizedQuery: optimized.optimizedQuery,
          terms: optimized.terms,
          relatedTerms: optimized.relatedTerms,
          filters,
          sort,
          seen,
          now,
          limit: BATCH,
        });
      } else {
        const prismaWhere = buildFeedVideoPrismaWhere({
          q: optimized.optimizedQuery,
          platform,
          minViews,
          period,
          now,
        });
        round = await loadAndPickMore({
          prismaWhere,
          filters,
          sort,
          seen,
          batchIndex,
          mixSeed: `${optimized.optimizedQuery}|${platform}|${sort}`,
          now,
          searchQuery: optimized.optimizedQuery,
        });
      }

      await logAdminEvent({
        level: "info",
        type: action === "more" ? "feed_more" : "feed_search",
        message: `Кандидаты после внешнего поиска (${action})`,
        sessionId: sessionKey,
        userId,
        meta: safeMeta({
          rowsDb: round.rowsDb,
          matchingCount: round.matchingCount,
          unseenCount: round.unseenCount,
          pickedCount: round.picked.length,
        }),
      });
    }
  }

  const clientVideos = serializePicked(round.picked);
  const pickedStats = computeFeedVideoStats(round.picked, now);

  await logAdminEvent({
    level: "info",
    type: action === "more" ? "feed_more" : "feed_search",
    message: "Ответ ленты",
    sessionId: sessionKey,
    userId,
    meta: safeMeta({
      delivered: clientVideos.length,
      platformBreakdown: { youtube: pickedStats.youtube, instagram: pickedStats.instagram },
      ageBreakdown: {
        upTo7d: pickedStats.ageLe7,
        days8to30: pickedStats.age8to30,
        older: pickedStats.ageOlder,
      },
    }),
  });

  const noMore = clientVideos.length === 0 && action === "more";

  if (action === "search" && clientVideos.length < BATCH && !feedUserHint) {
    feedUserHint =
      "Найдено меньше роликов, чем запрошено. Попробуйте расширить период или изменить фильтры.";
  }

  if (externalRan) {
    throttledDetectTrends(action === "search" ? "feed_search" : "feed_more").catch((error) => {
      console.error("Background trend detection failed:", error);
    });
  }

  return NextResponse.json({
    tokensOk: true,
    tokensRemaining: spend.balance,
    videos: clientVideos,
    noMore,
    userHint: feedUserHint,
  });
}
