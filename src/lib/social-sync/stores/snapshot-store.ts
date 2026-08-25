import "server-only";

import { prisma } from "@/lib/prisma";

export async function createSnapshot(
  socialAccountId: string,
  platform: string,
  metrics: {
    followers: number | null;
    totalLikes: number | null;
    avgViews: number | null;
    avgEngagement: number | null;
    videoCount: number | null;
    monthlyViews: number | null;
    totalComments: number | null;
    engagementRate: number | null;
    rawJson?: Record<string, unknown>;
  },
): Promise<void> {
  await prisma.socialAccountSnapshot.create({
    data: {
      socialAccountId,
      platform,
      followers: metrics.followers,
      totalLikes: metrics.totalLikes,
      avgViews: metrics.avgViews,
      avgEngagement: metrics.avgEngagement,
      videoCount: metrics.videoCount,
      monthlyViews: metrics.monthlyViews,
      totalComments: metrics.totalComments,
      engagementRate: metrics.engagementRate,
      rawJson: metrics.rawJson ?? undefined,
    },
  });
}

export async function listSnapshots(socialAccountId: string, limit = 90) {
  return prisma.socialAccountSnapshot.findMany({
    where: { socialAccountId },
    orderBy: { capturedAt: "desc" },
    take: limit,
  });
}
