import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import type { Video } from "@prisma/client";
import { logAdminEvent, safeMeta } from "@/lib/admin-events";
import { prisma } from "@/lib/prisma";
import { buildFeedVideoPrismaWhere } from "@/lib/feed/build-feed-video-where";
import { videoMatchesFeedFilters, type FeedFilterPayload } from "@/lib/feed/feed-filters";
import { computeFeedVideoStats } from "@/lib/feed/feed-log-stats";
import { ingestYouTubeShortsForQuery } from "@/lib/feed/ingest-youtube";
import { upsertInstagramReelsFromTikHub } from "@/lib/feed/ingest-instagram";
import { searchInstagramReelsTikHub } from "@/lib/providers/tikhubInstagram";
import { pickSmartMixedBatch } from "@/lib/smart-mix";
import { ensureSessionUser, getTokenBalanceForUser, spendTokens } from "@/lib/token-wallet";
import { videoToClientJson } from "@/lib/serialize-video";
import { sortVideosList } from "@/lib/video-sort";
import { videoClientId } from "@/lib/video-client-id";
import type { ApiSort, PeriodApi } from "@/lib/search-query";

export const dynamic = "force-dynamic";

const BATCH = 8;
const TOKEN_COST = 5;
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
  tokenCost?: number;
};

function parsePlatform(p: string | undefined): FeedFilterPayload["platform"] {
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

async function loadAndPick(args: {
  prismaWhere: Prisma.VideoWhereInput;
  filters: FeedFilterPayload;
  sort: ApiSort;
  seen: Set<string>;
  batchIndex: number;
  mixSeed: string;
  now: Date;
  mixMode: "search" | "more";
}): Promise<{
  picked: Video[];
  unseenCount: number;
  rowsDb: number;
  matchingCount: number;
  unseenInstagramInPool: number;
}> {
  const rows = await prisma.video.findMany({
    where: args.prismaWhere,
    orderBy: [{ rating: "desc" }, { score: "desc" }, { views: "desc" }],
    take: 800,
  });

  const matching = rows.filter((v) => videoMatchesFeedFilters(v, args.filters, args.now));
  const unseen = matching.filter((v) => !args.seen.has(videoClientId(v.platform, v.externalId)));
  const sortedPool = sortVideosList(unseen, args.sort) as Video[];
  const picked = pickSmartMixedBatch(sortedPool, args.batchIndex, BATCH, {
    mode: args.mixMode,
    now: args.now,
    platformFilter: args.filters.platform,
    minViewsFloor: args.filters.minViews,
    mixSeed: args.mixSeed,
  });
  return {
    picked,
    unseenCount: unseen.length,
    rowsDb: rows.length,
    matchingCount: matching.length,
    unseenInstagramInPool: unseen.filter((v) => v.platform === "instagram").length,
  };
}

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const action = body.action === "more" ? "more" : "search";
  const q = (body.q ?? "").trim();
  if (!q) {
    return NextResponse.json({ error: "bad_request", message: "q обязателен" }, { status: 400 });
  }

  const { userId, sessionKey } = await ensureSessionUser();
  const cost = Math.min(100, Math.max(1, Number(body.tokenCost) || TOKEN_COST));

  const platform = parsePlatform(body.platform);
  const period = parsePeriod(body.period);
  const sort = parseSort(body.sort);
  const minViewsRaw = Number(body.minViews ?? 0);
  const minViews = Number.isFinite(minViewsRaw) ? Math.max(0, Math.floor(minViewsRaw)) : 0;
  const languageMode = body.languageMode === "ru" || body.languageMode === "en" ? body.languageMode : "world";
  const region = (body.region ?? "").trim();
  const language = (body.language ?? "").trim();

  const filters: FeedFilterPayload = {
    q,
    period,
    minViews,
    languageMode,
    platform,
  };

  const seen = new Set((body.seenIds ?? []).filter(Boolean));
  const batchIndex = Math.max(0, Math.floor(Number(body.batchIndex) || 0));
  const now = new Date();

  await logAdminEvent({
    level: "info",
    type: action === "more" ? "feed_more" : "feed_search",
    message: `Запрос ленты (${action})`,
    sessionId: sessionKey,
    userId,
    meta: safeMeta({
      action,
      q,
      platform,
      period,
      sort,
      minViews,
      languageMode,
      batchIndex,
      seenIdsCount: seen.size,
      tokenCost: action === "more" ? cost : 0,
    }),
  });

  if (action === "more") {
    const spend = await spendTokens(userId, cost, "feed_show_more", { sessionId: sessionKey });
    if (!spend.ok) {
      await logAdminEvent({
        level: "warn",
        type: "feed_more",
        message: "Отказ: недостаточно токенов",
        sessionId: sessionKey,
        userId,
        meta: safeMeta({ cost, balance: spend.balance }),
      });
      return NextResponse.json(
        {
          tokensOk: false,
          tokensRemaining: spend.balance,
          videos: [],
          noMore: true,
          message: "Недостаточно внутренних токенов",
        },
        { status: 402 },
      );
    }
  }

  const prismaWhere = buildFeedVideoPrismaWhere({
    q,
    platform,
    minViews,
    period,
    now,
  });

  const mixSeed = `${q}|${platform}|${sort}`;

  let round = await loadAndPick({
    prismaWhere,
    filters,
    sort,
    seen,
    batchIndex,
    mixSeed,
    now,
    mixMode: action === "more" ? "more" : "search",
  });

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
    }),
  });

  const lowPool = round.unseenCount < THRESH_MORE;
  const wantYt =
    action === "more" && platform !== "instagram" && Boolean(process.env.YOUTUBE_API_KEY?.trim()) && lowPool;
  const wantIg =
    action === "more" &&
    platform !== "youtube" &&
    (lowPool || (platform === "all" && round.unseenInstagramInPool === 0));

  if (action === "more" && (wantYt || wantIg)) {
    await logAdminEvent({
      level: "info",
      type: "api_fetch",
      message: "Добор через внешние API",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({ wantYoutube: wantYt, wantTikHubInstagram: wantIg, q }),
    });

    const ytKey = process.env.YOUTUBE_API_KEY?.trim();
    const ytPromise =
      wantYt && ytKey
        ? ingestYouTubeShortsForQuery({
            q,
            apiKey: ytKey,
            region,
            language,
            period,
            sort,
            minViews,
          })
        : Promise.resolve({ saved: 0 });

    const igPromise = wantIg
      ? (async () => {
          try {
            const ig = await searchInstagramReelsTikHub(q);
            if (!ig.reels.length) return { saved: 0, reelsFound: 0 };
            const n = await upsertInstagramReelsFromTikHub(ig.reels, q, ig.cacheUrl);
            return { saved: n, reelsFound: ig.reels.length };
          } catch (e) {
            await logAdminEvent({
              level: "error",
              type: "error",
              message: "Instagram upsert pipeline",
              sessionId: sessionKey,
              userId,
              meta: safeMeta({
                provider: "tikhub_instagram",
                error: e instanceof Error ? { name: e.name, message: e.message } : String(e),
              }),
            });
            return { saved: 0, reelsFound: 0 };
          }
        })()
      : Promise.resolve({ saved: 0, reelsFound: 0 });

    const [ytRes, igRes] = await Promise.all([ytPromise, igPromise]);
    const ytSaved = "saved" in ytRes ? ytRes.saved : 0;
    const igSaved = igRes.saved;

    await logAdminEvent({
      level: "info",
      type: "upsert",
      message: "После добора: upsert",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({
        youtubeSaved: ytSaved,
        instagramSaved: igSaved,
        instagramReelsFetched: "reelsFound" in igRes ? igRes.reelsFound : 0,
      }),
    });

    round = await loadAndPick({
      prismaWhere,
      filters,
      sort,
      seen,
      batchIndex,
      mixSeed,
      now,
      mixMode: "more",
    });

    await logAdminEvent({
      level: "info",
      type: "feed_more",
      message: "Кандидаты после добора",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({
        rowsDb: round.rowsDb,
        matchingCount: round.matchingCount,
        unseenCount: round.unseenCount,
        unseenInstagramInPool: round.unseenInstagramInPool,
        pickedCount: round.picked.length,
      }),
    });
  }

  const picked = round.picked;
  const pickedStats = computeFeedVideoStats(picked, now);

  await logAdminEvent({
    level: "info",
    type: action === "more" ? "feed_more" : "feed_search",
    message: "Ответ ленты",
    sessionId: sessionKey,
    userId,
    meta: safeMeta({
      delivered: picked.length,
      platformBreakdown: { youtube: pickedStats.youtube, instagram: pickedStats.instagram },
      ageBreakdown: {
        upTo7d: pickedStats.ageLe7,
        days8to30: pickedStats.age8to30,
        older: pickedStats.ageOlder,
      },
    }),
  });

  const tokensRemaining = await getTokenBalanceForUser(userId);
  const totalCount = await prisma.video.count();

  const noMore = picked.length === 0 && action === "more";

  return NextResponse.json({
    tokensOk: true,
    tokensRemaining,
    videos: picked.map(videoToClientJson),
    noMore,
    totalCount,
  });
}
