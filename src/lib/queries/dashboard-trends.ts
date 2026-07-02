import { prisma } from "@/lib/prisma";
import { videoTrendPreviewSelect } from "@/lib/prisma-video-select";
import { videoToTrendingJson } from "@/lib/serialize-video";
import type { TrendsPayload } from "@/lib/dashboard-fetch";
import { isDisplayableTrendVideo, withResolvedTrendThumbnail } from "@/lib/grid-video-display";
import { DISPLAYABLE_THUMBNAIL_VIDEO_WHERE } from "@/lib/thumbnail-pipeline";

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
  const video = withResolvedTrendThumbnail(videoToTrendingJson(item.video));
  return {
    id: item.id,
    video,
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
      video: DISPLAYABLE_THUMBNAIL_VIDEO_WHERE,
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
    take: 20,
  });

  const newItems = [];

  for (const item of queuedItems) {
    const serialized = serializeTrendItem(item);
    if (!isDisplayableTrendVideo(serialized.video)) continue;

    await prisma.trendItem.update({
      where: { id: item.id },
      data: {
        status: "published",
        publishedAt: now,
      },
    });

    newItems.push({ ...serialized, publishedAt: now.toISOString() });
    break;
  }

  return newItems;
}

export async function queryRealtimeTrendsPayload(limit: number): Promise<TrendsPayload> {
  const now = new Date();
  const newItems = await publishDueQueuedTrendItems(now);

  const oversample = Math.min(60, Math.max(limit * 5, limit + 20));
  const publishedItems = await prisma.trendItem.findMany({
    where: {
      status: "published",
      video: DISPLAYABLE_THUMBNAIL_VIDEO_WHERE,
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
    orderBy: [{ publishedAt: "desc" }, { trendScore: "desc" }],
    take: oversample,
  });

  const trends = [];
  for (const item of publishedItems) {
    const row = serializeTrendItem(item);
    if (!isDisplayableTrendVideo(row.video)) continue;
    trends.push(row);
    if (trends.length >= limit) break;
  }

  return { trends, newItems };
}
