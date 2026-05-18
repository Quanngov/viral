import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { videoToClientJson } from "@/lib/serialize-video";
import { logAdminEvent, safeMeta } from "@/lib/admin-events";
import { ensureTrendPool } from "@/lib/trends/ensure-trend-pool";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.min(20, Math.max(1, parseInt(limitParam, 10))) : 10;

    const now = new Date();
    const newItems: Array<{
      id: string;
      video: ReturnType<typeof videoToClientJson>;
      trendScore: number;
      reason: string | null;
      source: string | null;
      publishedAt: string;
    }> = [];

    // 0. Обеспечиваем минимальный пул трендов
    await ensureTrendPool({
      minPublished: limit,
      minTotal: limit * 2,
      source: "realtime",
    });

    // 1. Проверяем queued TrendItem с releaseAt <= now и публикуем максимум 1
    const queuedItems = await prisma.trendItem.findMany({
      where: {
        status: "queued",
        releaseAt: {
          lte: now,
        },
      },
      include: {
        video: true,
      },
      orderBy: [
        { releaseAt: "asc" },
        { trendScore: "desc" },
      ],
      take: 1, // Максимум 1 за раз
    });

    // Публикуем найденный элемент
    for (const item of queuedItems) {
      try {
        await prisma.trendItem.update({
          where: { id: item.id },
          data: {
            status: "published",
            publishedAt: now,
          },
        });

        const videoJson = videoToClientJson(item.video);
        newItems.push({
          id: item.id,
          video: videoJson,
          trendScore: item.trendScore,
          reason: item.reason,
          source: item.source,
          publishedAt: now.toISOString(),
        });

        await logAdminEvent({
          level: "info",
          type: "trend_candidate_published",
          message: "Опубликован трендовый кандидат",
          meta: safeMeta({
            trendItemId: item.id,
            videoId: item.video.id,
            platform: item.video.platform,
            title: item.video.title.substring(0, 80),
            trendScore: item.trendScore,
            reason: item.reason,
            source: item.source,
          }),
        });
      } catch (error) {
        console.error("Failed to publish trend item:", error);
      }
    }

    // 2. Получаем published TrendItem для показа
    const publishedItems = await prisma.trendItem.findMany({
      where: {
        status: "published",
      },
      include: {
        video: true,
      },
      orderBy: [
        { publishedAt: "desc" },
        { trendScore: "desc" },
      ],
      take: limit,
    });

    const trends = publishedItems.map((item) => ({
      id: item.id,
      video: videoToClientJson(item.video),
      trendScore: item.trendScore,
      reason: item.reason,
      source: item.source,
      publishedAt: item.publishedAt?.toISOString(),
      detectedAt: item.detectedAt.toISOString(),
    }));

    return NextResponse.json({
      trends,
      newItems,
      meta: {
        totalPublished: trends.length,
        newItemsCount: newItems.length,
        timestamp: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Realtime trends error:", error);

    try {
      await logAdminEvent({
        level: "error",
        type: "trend_realtime_error",
        message: "Ошибка при получении realtime трендов",
        meta: safeMeta({
          error: error instanceof Error ? error.message : String(error),
        }),
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      {
        error: "internal_error",
        message: "Ошибка при загрузке трендов",
      },
      { status: 500 }
    );
  }
}