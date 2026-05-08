import { NextResponse } from "next/server";
import { adminForbiddenResponse, isAdminRequestAuthorized } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAdminRequestAuthorized(req)) return adminForbiddenResponse();

  const [total, agg, byPlatform] = await Promise.all([
    prisma.video.count(),
    prisma.video.aggregate({
      _avg: { score: true },
      _max: { views: true, updatedAt: true, lastFetchedAt: true },
    }),
    prisma.video.groupBy({
      by: ["platform"],
      _count: { _all: true },
    }),
  ]);

  const youtubeCount = byPlatform.find((r) => r.platform === "youtube")?._count._all ?? 0;
  const instagramCount = byPlatform.find((r) => r.platform === "instagram")?._count._all ?? 0;

  const lastUpdated = agg._max.updatedAt;
  const lastFetched = agg._max.lastFetchedAt;
  let lastActivityAt: Date | null = lastUpdated;
  if (lastFetched && (!lastActivityAt || lastFetched > lastActivityAt)) lastActivityAt = lastFetched;

  return NextResponse.json({
    totalVideos: total,
    youtubeCount,
    instagramCount,
    avgScore: agg._avg.score != null ? Math.round(agg._avg.score * 100) / 100 : null,
    maxViews: agg._max.views ?? 0,
    lastActivityAt: lastActivityAt?.toISOString() ?? null,
  });
}
