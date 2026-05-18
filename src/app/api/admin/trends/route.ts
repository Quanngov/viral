import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminForbiddenResponse, isAdminRequestAuthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAdminRequestAuthorized(req)) return adminForbiddenResponse();

  try {
    const trends = await prisma.trendItem.findMany({
      include: {
        video: {
          select: {
            title: true,
            platform: true,
            authorUsername: true,
            views: true,
            rating: true,
            publishedAt: true,
          },
        },
      },
      orderBy: [
        { status: "asc" }, // queued first
        { trendScore: "desc" },
        { detectedAt: "desc" },
      ],
      take: 100, // Ограничиваем для производительности
    });

    const formattedTrends = trends.map(trend => ({
      id: trend.id,
      videoId: trend.videoId,
      status: trend.status,
      trendScore: trend.trendScore,
      reason: trend.reason,
      source: trend.source,
      detectedAt: trend.detectedAt.toISOString(),
      releaseAt: trend.releaseAt?.toISOString() || null,
      publishedAt: trend.publishedAt?.toISOString() || null,
      video: {
        title: trend.video.title,
        platform: trend.video.platform,
        authorUsername: trend.video.authorUsername,
        views: trend.video.views,
        rating: trend.video.rating,
        publishedAt: trend.video.publishedAt.toISOString(),
      },
    }));

    return NextResponse.json({
      trends: formattedTrends,
      meta: {
        total: trends.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Admin trends error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Ошибка при загрузке трендов" },
      { status: 500 }
    );
  }
}