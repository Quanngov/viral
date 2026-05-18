import { prisma } from "@/lib/prisma";
import { logAdminEvent, safeMeta } from "@/lib/admin-events";

export type EnsureTrendPoolResult = {
  publishedBefore: number;
  totalBefore: number;
  created: number;
  publishedCreated: number;
  queuedCreated: number;
  publishedAfter: number;
  totalAfter: number;
};

/**
 * Обеспечивает минимальное количество трендов в пуле.
 * Использует многослойную стратегию выбора роликов из Video.
 */
export async function ensureTrendPool({
  minPublished = 10,
  minTotal = 20,
  source = "ensure_pool",
}: {
  minPublished?: number;
  minTotal?: number;
  source?: string;
} = {}): Promise<EnsureTrendPoolResult> {
  const now = new Date();

  try {
    await logAdminEvent({
      level: "info",
      type: "trend_pool_ensure_started",
      message: "Запуск обеспечения пула трендов",
      meta: safeMeta({ minPublished, minTotal, source }),
    });

    // 1. Считаем текущее состояние
    const [publishedCount, totalCount] = await Promise.all([
      prisma.trendItem.count({ where: { status: "published" } }),
      prisma.trendItem.count(),
    ]);

    if (publishedCount >= minPublished) {
      await logAdminEvent({
        level: "info",
        type: "trend_pool_ensure_skipped",
        message: "Пул трендов уже достаточен",
        meta: safeMeta({
          publishedBefore: publishedCount,
          totalBefore: totalCount,
          minPublished,
          source,
        }),
      });

      return {
        publishedBefore: publishedCount,
        totalBefore: totalCount,
        created: 0,
        publishedCreated: 0,
        queuedCreated: 0,
        publishedAfter: publishedCount,
        totalAfter: totalCount,
      };
    }

    // 2. Получаем существующие videoId в TrendItem
    const existingTrendItems = await prisma.trendItem.findMany({
      select: { videoId: true },
    });
    const existingVideoIds = new Set(existingTrendItems.map(item => item.videoId));

    // 3. Многослойный поиск роликов
    const needed = Math.max(minPublished - publishedCount, minTotal - totalCount);
    const candidates = await getVideoCandidates(existingVideoIds, needed);

    if (candidates.length === 0) {
      await logAdminEvent({
        level: "warn",
        type: "trend_pool_ensure_error",
        message: "Не найдено подходящих роликов для пула трендов",
        meta: safeMeta({
          publishedBefore: publishedCount,
          totalBefore: totalCount,
          source,
        }),
      });

      return {
        publishedBefore: publishedCount,
        totalBefore: totalCount,
        created: 0,
        publishedCreated: 0,
        queuedCreated: 0,
        publishedAfter: publishedCount,
        totalAfter: totalCount,
      };
    }

    // 4. Создаем TrendItem
    let created = 0;
    let publishedCreated = 0;
    let queuedCreated = 0;
    const publishedNeeded = Math.max(0, minPublished - publishedCount);

    for (let i = 0; i < Math.min(candidates.length, needed); i++) {
      const video = candidates[i];
      
      try {
        const isPublished = publishedCreated < publishedNeeded;
        const releaseAt = isPublished ? now : new Date(now.getTime() + (queuedCreated + 1) * 10 * 60 * 1000);

        await prisma.trendItem.create({
          data: {
            videoId: video.id,
            status: isPublished ? "published" : "queued",
            trendScore: Math.max(video.rating, video.score),
            reason: getTrendReason(video),
            source: `${source}_seed`,
            releaseAt: isPublished ? now : releaseAt,
            publishedAt: isPublished ? now : null,
            metricsSnapshot: {
              views: video.views,
              likes: video.likes,
              comments: video.comments,
              shares: video.shares,
              rating: video.rating,
              viewsPerHour: video.viewsPerHour,
              engagementRate: video.engagementRate,
              followerCount: video.followerCount,
              retentionRate: video.retentionRate,
            },
          },
        });

        created++;
        if (isPublished) {
          publishedCreated++;
        } else {
          queuedCreated++;
        }

      } catch (error) {
        console.error("Failed to create trend item:", error);
      }
    }

    const result = {
      publishedBefore: publishedCount,
      totalBefore: totalCount,
      created,
      publishedCreated,
      queuedCreated,
      publishedAfter: publishedCount + publishedCreated,
      totalAfter: totalCount + created,
    };

    await logAdminEvent({
      level: "info",
      type: "trend_pool_ensure_finished",
      message: "Завершено обеспечение пула трендов",
      meta: safeMeta({ ...result, source }),
    });

    return result;

  } catch (error) {
    await logAdminEvent({
      level: "error",
      type: "trend_pool_ensure_error",
      message: "Ошибка при обеспечении пула трендов",
      meta: safeMeta({
        error: error instanceof Error ? error.message : String(error),
        source,
      }),
    });

    throw error;
  }
}

/**
 * Многослойная стратегия выбора роликов из Video
 */
async function getVideoCandidates(existingVideoIds: Set<string>, needed: number) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const candidates = [];

  // Слой A - идеальные тренды
  if (candidates.length < needed) {
    const layerA = await prisma.video.findMany({
      where: {
        id: { notIn: Array.from(existingVideoIds) },
        thumbnailUrl: { not: null },
        views: { gt: 0 },
        publishedAt: { gte: thirtyDaysAgo },
        durationSeconds: { lte: 60 },
        OR: [
          { rating: { gte: 70 } },
          { score: { gte: 70 } },
        ],
      },
      orderBy: [
        { rating: "desc" },
        { score: "desc" },
        { viewsPerHour: "desc" },
        { views: "desc" },
      ],
      take: needed,
    });
    
    candidates.push(...layerA);
    layerA.forEach(v => existingVideoIds.add(v.id));
  }

  // Слой B - расширенные критерии
  if (candidates.length < needed) {
    const remainingNeeded = needed - candidates.length;
    const layerB = await prisma.video.findMany({
      where: {
        id: { notIn: Array.from(existingVideoIds) },
        thumbnailUrl: { not: null },
        views: { gt: 0 },
        durationSeconds: { lte: 90 },
      },
      orderBy: [
        { rating: "desc" },
        { score: "desc" },
        { viewsPerHour: "desc" },
        { views: "desc" },
      ],
      take: remainingNeeded,
    });
    
    candidates.push(...layerB);
    layerB.forEach(v => existingVideoIds.add(v.id));
  }

  // Слой C - минимальные требования
  if (candidates.length < needed) {
    const remainingNeeded = needed - candidates.length;
    const layerC = await prisma.video.findMany({
      where: {
        id: { notIn: Array.from(existingVideoIds) },
        thumbnailUrl: { not: null },
        views: { gt: 0 },
      },
      orderBy: [
        { rating: "desc" },
        { score: "desc" },
        { views: "desc" },
      ],
      take: remainingNeeded,
    });
    
    candidates.push(...layerC);
  }

  return candidates;
}

/**
 * Определяет причину тренда на основе метрик ролика
 */
function getTrendReason(video: {
  publishedAt: Date;
  viewsPerHour: number;
  rating: number;
  views: number;
  followerCount: number | null;
}): string {
  const now = new Date();
  const ageMs = now.getTime() - video.publishedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays <= 3 && video.viewsPerHour > 1000) {
    return "Быстрый рост";
  }
  
  if (video.rating >= 85) {
    return "Высокий рейтинг";
  }
  
  if (video.views > 100000) {
    return "Популярный ролик";
  }
  
  if (video.followerCount && video.views / video.followerCount >= 5) {
    return "Высокое вовлечение аудитории";
  }

  return "Топ ролик базы";
}