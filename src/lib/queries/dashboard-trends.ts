import { prisma } from "@/lib/prisma";
import { videoTrendPreviewSelect } from "@/lib/prisma-video-select";
import { videoToTrendingJson } from "@/lib/serialize-video";
import type { TrendsPayload } from "@/lib/dashboard-fetch";

type TrendRow = {
  id: string;
  trendScore: number;
  reason: string | null;
  source: string | null;
  publishedAt: Date | null;
  detectedAt: Date;
  video: Parameters<typeof videoToTrendingJson>[0];
};

function serializeTrendItem(item: TrendRow) {
  return {
    id: item.id,
    video: videoToTrendingJson(item.video),
    trendScore: item.trendScore,
    reason: item.reason,
    source: item.source,
    publishedAt: item.publishedAt?.toISOString(),
    detectedAt: item.detectedAt.toISOString(),
  };
}

/** Publish queued trends whose release time has passed (max 1 per poll). */
async function publishDueQueuedTrendItems(now: Date) {
  const queuedItems = await prisma.trendItem.findMany({
    where: {
      status: "queued",
      releaseAt: { lte: now },
    },
    select: {
      id: true,
      trendScore: true,
      reason: true,
      source: true,
      publishedAt: true,
      detectedAt: true,
      video: { select: videoTrendPreviewSelect },
    },
    orderBy: [{ releaseAt: "asc" }, { trendScore: "desc" }],
    take: 1,
  });

  const newItems = [];

  for (const item of queuedItems) {
    await prisma.trendItem.update({
      where: { id: item.id },
      data: {
        status: "published",
        publishedAt: now,
      },
    });

    newItems.push(
      serializeTrendItem({
        ...item,
        publishedAt: now,
      }),
    );
  }

  return newItems;
}

export async function queryRealtimeTrendsPayload(limit: number): Promise<TrendsPayload> {
  const now = new Date();
  const newItems = await publishDueQueuedTrendItems(now);

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

  const trends = publishedItems.map((item) => serializeTrendItem(item));

  return { trends, newItems };
}
