import type { Video } from "@prisma/client";
import { videoMatchesFeedFilters, type FeedFilterPayload } from "@/lib/feed/feed-filters";
import {
  buildFeedVideoPrismaWhere,
  buildFeedVideoPrismaWhereForTerms,
} from "@/lib/feed/build-feed-video-where";
import { prisma } from "@/lib/prisma";
import { rankVideosForSearch } from "@/lib/search-ranking";
import type { ApiSort, PeriodApi } from "@/lib/search-query";
import { videoClientId } from "@/lib/video-client-id";
import { computeRelevanceScore } from "@/lib/scoring";
import { videoRowHasDisplayableThumbnail } from "@/lib/thumbnail-pipeline";

export const SEARCH_BATCH = 8;

/** Expansion always scans up to the last month of content. */
export const SEARCH_EXPANSION_PERIOD: PeriodApi = "month";

type SearchTier = "phrase" | "all_terms" | "semantic" | "any_term" | "related" | "month_pool";

type TierSpec = {
  tier: SearchTier;
  phrase?: string;
  terms: string[];
  period?: PeriodApi;
};

function buildTiers(args: {
  optimizedQuery: string;
  terms: string[];
  relatedTerms: string[];
  userPeriod: PeriodApi;
}): TierSpec[] {
  const primary = args.terms.length > 0 ? args.terms : args.optimizedQuery.split(/\s+/).filter(Boolean);
  const semantic = [...new Set([...primary, ...args.relatedTerms])];
  const related = args.relatedTerms.length > 0 ? args.relatedTerms : semantic;

  const tiers: TierSpec[] = [
    { tier: "phrase", phrase: args.optimizedQuery, terms: primary, period: args.userPeriod },
    { tier: "all_terms", terms: primary, period: args.userPeriod },
    { tier: "semantic", terms: semantic, period: args.userPeriod },
    { tier: "any_term", terms: primary, period: args.userPeriod },
    { tier: "related", terms: related, period: args.userPeriod },
  ];

  if (args.userPeriod !== SEARCH_EXPANSION_PERIOD && args.userPeriod !== "all") {
    tiers.push({ tier: "month_pool", terms: related, period: SEARCH_EXPANSION_PERIOD });
  } else if (args.userPeriod === "all") {
    tiers.push({ tier: "month_pool", terms: related, period: SEARCH_EXPANSION_PERIOD });
  }

  return tiers;
}

function videoMatchesTier(v: Video, spec: TierSpec): boolean {
  const hay = `${v.title} ${v.description ?? ""} ${v.channelTitle ?? ""} ${v.authorUsername ?? ""} ${v.authorDisplayName ?? ""} ${v.sourceQuery ?? ""}`.toLowerCase();
  const phrase = spec.phrase?.toLowerCase().trim();
  if (spec.tier === "phrase" && phrase) {
    if (hay.includes(phrase)) return true;
    return spec.terms.length > 0 && spec.terms.every((t) => hay.includes(t));
  }
  if (spec.tier === "all_terms") {
    return spec.terms.length > 0 && spec.terms.every((t) => hay.includes(t.toLowerCase()));
  }
  if (spec.tier === "semantic" || spec.tier === "any_term" || spec.tier === "related" || spec.tier === "month_pool") {
    return spec.terms.some((t) => hay.includes(t.toLowerCase()));
  }
  return true;
}

function minRelevanceForTier(tier: SearchTier): number {
  switch (tier) {
    case "phrase":
      return 0.38;
    case "all_terms":
      return 0.3;
    case "semantic":
      return 0.24;
    case "any_term":
      return 0.18;
    case "related":
      return 0.14;
    case "month_pool":
      return 0.08;
    default:
      return 0;
  }
}

function tierTake(tier: SearchTier): number {
  if (tier === "month_pool" || tier === "related") return 1400;
  if (tier === "semantic" || tier === "any_term") return 1100;
  return 900;
}

export type LocalSearchResult = {
  picked: Video[];
  unseenCount: number;
  rowsDb: number;
  matchingCount: number;
  unseenInstagramInPool: number;
  tierUsed: SearchTier | "none";
};

export async function searchLocalVideos(args: {
  optimizedQuery: string;
  terms: string[];
  relatedTerms: string[];
  filters: FeedFilterPayload;
  sort: ApiSort;
  seen: Set<string>;
  now: Date;
  limit?: number;
}): Promise<LocalSearchResult> {
  const limit = args.limit ?? SEARCH_BATCH;
  const tiers = buildTiers({
    optimizedQuery: args.optimizedQuery,
    terms: args.terms,
    relatedTerms: args.relatedTerms,
    userPeriod: args.filters.period,
  });
  const collected = new Map<string, Video>();
  let rowsDb = 0;
  let tierUsed: SearchTier | "none" = "none";

  for (const spec of tiers) {
    const period = spec.period ?? args.filters.period;
    const termMode = spec.tier === "all_terms" ? "all" : "any";
    const searchTerms = spec.terms;
    const prismaWhere =
      spec.tier === "phrase" && spec.phrase
        ? buildFeedVideoPrismaWhere({
            q: spec.phrase,
            platform: args.filters.platform,
            minViews: args.filters.minViews,
            period,
            now: args.now,
          })
        : buildFeedVideoPrismaWhereForTerms({
            terms: searchTerms,
            matchMode: termMode,
            platform: args.filters.platform,
            minViews: args.filters.minViews,
            period,
            now: args.now,
          });

    const rows = await prisma.video.findMany({
      where: prismaWhere,
      orderBy: [{ viralScore: "desc" }, { views: "desc" }, { rating: "desc" }],
      take: tierTake(spec.tier),
    });
    rowsDb += rows.length;

    const minRel = minRelevanceForTier(spec.tier);
    const tierFilters: FeedFilterPayload = { ...args.filters, period };

    for (const v of rows) {
      if (!videoMatchesFeedFilters(v, tierFilters, args.now)) continue;
      if (!videoMatchesTier(v, spec)) continue;

      const rel = computeRelevanceScore(
        args.optimizedQuery,
        v.title,
        v.description ?? "",
        `${v.channelTitle ?? ""} ${v.authorDisplayName ?? ""} ${v.sourceQuery ?? ""}`,
      );
      if (rel < minRel) continue;

      if (!collected.has(v.id)) {
        collected.set(v.id, v);
        if (tierUsed === "none") tierUsed = spec.tier;
      }
    }

    const unseenInTier = [...collected.values()].filter(
      (v) => !args.seen.has(videoClientId(v.platform, v.externalId)),
    );
    const displayableCount = unseenInTier.filter((v) => videoRowHasDisplayableThumbnail(v)).length;
    if (displayableCount >= limit) break;
  }

  const pool = [...collected.values()];
  const unseen = pool.filter((v) => !args.seen.has(videoClientId(v.platform, v.externalId)));
  const ranked = rankVideosForSearch(unseen, args.optimizedQuery, args.sort, args.now);
  const thumbOk = ranked.filter((v) => videoRowHasDisplayableThumbnail(v));
  const picked = thumbOk.slice(0, limit);

  return {
    picked,
    unseenCount: unseen.length,
    rowsDb,
    matchingCount: pool.length,
    unseenInstagramInPool: unseen.filter((v) => v.platform === "instagram").length,
    tierUsed,
  };
}
