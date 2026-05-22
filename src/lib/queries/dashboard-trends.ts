import { prisma } from "@/lib/prisma";
import { videoTrendPreviewSelect } from "@/lib/prisma-video-select";
import { videoToTrendingJson } from "@/lib/serialize-video";
import type { TrendsPayload } from "@/lib/dashboard-fetch";

export async function queryRealtimeTrendsPayload(limit: number): Promise<TrendsPayload> {
  const publishedItems = await prisma.trendItem.findMany({
    where: { status: "published" },
    select: {
      id: true,
      trendScore: true,
      reason: true,
      source: true,
      publishedAt: true,
      detectedAt: true,
      video: { select: videoTrendPreviewSelect },
    },
    orderBy: [{ publishedAt: "desc" }, { trendScore: "desc" }],
    take: limit,
  });

  const trends = publishedItems.map((item) => ({
    id: item.id,
    video: videoToTrendingJson(item.video),
    trendScore: item.trendScore,
    reason: item.reason,
    source: item.source,
    publishedAt: item.publishedAt?.toISOString(),
    detectedAt: item.detectedAt.toISOString(),
  }));

  return { trends, newItems: [] };
}
