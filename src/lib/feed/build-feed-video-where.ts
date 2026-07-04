import type { Prisma } from "@prisma/client";
import type { PeriodApi, FeedPlatformMode } from "@/lib/search-query";
import { DISPLAYABLE_THUMBNAIL_VIDEO_WHERE } from "@/lib/thumbnail-pipeline";

function textFieldContains(term: string): Prisma.StringFilter {
  return { contains: term, mode: "insensitive" };
}

function termOrClause(term: string): Prisma.VideoWhereInput {
  return {
    OR: [
      { title: textFieldContains(term) },
      { description: textFieldContains(term) },
      { sourceQuery: textFieldContains(term) },
      { channelTitle: textFieldContains(term) },
      { authorUsername: textFieldContains(term) },
      { authorDisplayName: textFieldContains(term) },
      { niche: textFieldContains(term) },
    ],
  };
}

function startUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}

/**
 * Ограничение publishedAt для Prisma (UTC-день как в period-filter).
 */
export function publishedAtFilterForPeriod(
  period: PeriodApi,
  now: Date,
): Prisma.DateTimeFilter | undefined {
  switch (period) {
    case "all":
      return undefined;
    case "today": {
      const s = startUtcDay(now);
      return { gte: s, lte: now };
    }
    case "yesterday": {
      const y = new Date(now);
      y.setUTCDate(y.getUTCDate() - 1);
      const s = startUtcDay(y);
      const e = new Date(startUtcDay(now).getTime() - 1);
      return { gte: s, lte: e };
    }
    case "week":
      return { gte: new Date(now.getTime() - 7 * 24 * 3600 * 1000), lte: now };
    case "month":
      return { gte: new Date(now.getTime() - 30 * 24 * 3600 * 1000), lte: now };
    case "year":
      return { gte: new Date(now.getTime() - 365 * 24 * 3600 * 1000), lte: now };
    default:
      return undefined;
  }
}

export function buildFeedVideoPrismaWhere(args: {
  q: string;
  platform: FeedPlatformMode;
  minViews: number;
  period: PeriodApi;
  now: Date;
}): Prisma.VideoWhereInput {
  const parts: Prisma.VideoWhereInput[] = [DISPLAYABLE_THUMBNAIL_VIDEO_WHERE];
  if (args.platform !== "all") {
    parts.push({ platform: args.platform });
  }
  parts.push({ views: { gte: args.minViews } });
  const pub = publishedAtFilterForPeriod(args.period, args.now);
  if (pub) {
    parts.push({ publishedAt: pub });
  }
  const qt = args.q.trim();
  if (qt) {
    parts.push(termOrClause(qt));
  }
  return { AND: parts };
}

/** Word-level search: match all terms (AND) or any term (OR). */
export function buildFeedVideoPrismaWhereForTerms(args: {
  terms: string[];
  matchMode: "all" | "any";
  platform: FeedPlatformMode;
  minViews: number;
  period: PeriodApi;
  now: Date;
}): Prisma.VideoWhereInput {
  const parts: Prisma.VideoWhereInput[] = [DISPLAYABLE_THUMBNAIL_VIDEO_WHERE];
  if (args.platform !== "all") {
    parts.push({ platform: args.platform });
  }
  parts.push({ views: { gte: args.minViews } });
  const pub = publishedAtFilterForPeriod(args.period, args.now);
  if (pub) {
    parts.push({ publishedAt: pub });
  }

  const terms = args.terms.map((t) => t.trim()).filter((t) => t.length >= 2);
  if (terms.length > 0) {
    if (args.matchMode === "all") {
      parts.push({ AND: terms.map((t) => termOrClause(t)) });
    } else {
      parts.push({ OR: terms.flatMap((t) => termOrClause(t).OR ?? []) });
    }
  }

  return { AND: parts };
}
