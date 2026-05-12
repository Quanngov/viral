import type { Prisma } from "@prisma/client";
import type { PeriodApi, FeedPlatformMode } from "@/lib/search-query";

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
  const parts: Prisma.VideoWhereInput[] = [];
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
    parts.push({
      OR: [
        { title: { contains: qt } },
        { description: { contains: qt } },
        { sourceQuery: { contains: qt } },
        { channelTitle: { contains: qt } },
        { authorUsername: { contains: qt } },
        { authorDisplayName: { contains: qt } },
      ],
    });
  }
  return parts.length === 1 ? parts[0]! : { AND: parts };
}
