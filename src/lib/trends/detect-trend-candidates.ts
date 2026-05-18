import type { Video } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAdminEvent, safeMeta } from "@/lib/admin-events";

/**
 * Сканирует базу Video за последние 30 дней и добавляет сильные ролики в TrendItem.
 * Использует критерии для горячих роликов до 3 дней, сильных роликов недели и месяца.
 * Если строгий детектор не находит кандидатов, использует fallback-seed из топ роликов.
 */
export async function detectTrendCandidates(source = "db_scan"): Promise<{
  scanned: number;
  candidates: number;
  queued: number;
  seeded: number;
}> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Получаем все ролики за последние 30 дней
    const videos = await prisma.video.findMany({
      where: {
        publishedAt: {
          gte: thirtyDaysAgo,
        },
        rating: {
          gte: 70, // Минимальный рейтинг
        },
        views: {
          gt: 0,
        },
        thumbnailUrl: {
          not: null,
        },
      },
      orderBy: [
        { rating: "desc" },
        { views: "desc" },
      ],
      take: 1000, // Ограничиваем выборку
    });

    await logAdminEvent({
      level: "info",
      type: "trend_db_scan",
      message: "Начат скан базы для поиска трендовых кандидатов",
      meta: safeMeta({
        videosScanned: videos.length,
        source,
      }),
    });

    const candidates: Array<{
      video: Video;
      trendScore: number;
      reason: string;
    }> = [];

    for (const video of videos) {
      const candidate = evaluateVideoAsCandidate(video, now);
      if (candidate) {
        candidates.push(candidate);
      }
    }

    // Группируем по автору и берем максимум 2 ролика от одного автора
    const candidatesByAuthor = new Map<string, Array<typeof candidates[0]>>();
    for (const candidate of candidates) {
      const author = candidate.video.authorUsername || candidate.video.channelTitle || "unknown";
      if (!candidatesByAuthor.has(author)) {
        candidatesByAuthor.set(author, []);
      }
      candidatesByAuthor.get(author)!.push(candidate);
    }

    const finalCandidates: Array<typeof candidates[0]> = [];
    for (const authorCandidates of candidatesByAuthor.values()) {
      // Сортируем по trendScore и берем топ-2
      const sorted = authorCandidates.sort((a, b) => b.trendScore - a.trendScore);
      finalCandidates.push(...sorted.slice(0, 2));
    }

    // Сортируем финальных кандидатов по trendScore
    finalCandidates.sort((a, b) => b.trendScore - a.trendScore);

    let queuedCount = 0;
    let releaseOffset = 0;

    for (const candidate of finalCandidates) {
      try {
        // Проверяем, нет ли уже такого ролика в TrendItem
        const existing = await prisma.trendItem.findUnique({
          where: { videoId: candidate.video.id },
        });

        if (existing) {
          continue; // Пропускаем уже существующие
        }

        const releaseAt = new Date(now);
        if (releaseOffset === 0) {
          // Первый сразу доступен
        } else if (releaseOffset === 1) {
          releaseAt.setMinutes(releaseAt.getMinutes() + 5);
        } else if (releaseOffset === 2) {
          releaseAt.setMinutes(releaseAt.getMinutes() + 10);
        } else if (releaseOffset === 3) {
          releaseAt.setMinutes(releaseAt.getMinutes() + 15);
        } else {
          releaseAt.setMinutes(releaseAt.getMinutes() + 25);
        }

        await prisma.trendItem.create({
          data: {
            videoId: candidate.video.id,
            status: "queued",
            trendScore: candidate.trendScore,
            reason: candidate.reason,
            source,
            releaseAt,
            metricsSnapshot: {
              views: candidate.video.views,
              likes: candidate.video.likes,
              comments: candidate.video.comments,
              shares: candidate.video.shares,
              rating: candidate.video.rating,
              viewsPerHour: candidate.video.viewsPerHour,
              engagementRate: candidate.video.engagementRate,
              followerCount: candidate.video.followerCount,
              retentionRate: candidate.video.retentionRate,
            },
          },
        });

        queuedCount++;
        releaseOffset++;

        await logAdminEvent({
          level: "info",
          type: "trend_candidate_queued",
          message: "Добавлен трендовый кандидат",
          meta: safeMeta({
            videoId: candidate.video.id,
            platform: candidate.video.platform,
            title: candidate.video.title.substring(0, 80),
            author: candidate.video.authorUsername || candidate.video.channelTitle,
            trendScore: candidate.trendScore,
            reason: candidate.reason,
            views: candidate.video.views,
            rating: candidate.video.rating,
            releaseOffset,
            source,
          }),
        });
      } catch (error) {
        console.error("Failed to queue trend candidate:", error);
      }
    }

    await logAdminEvent({
      level: "info",
      type: "trend_db_scan_finished",
      message: "Завершен скан базы для трендов",
      meta: safeMeta({
        videosScanned: videos.length,
        candidatesFound: candidates.length,
        candidatesQueued: queuedCount,
        source,
      }),
    });

    // Проверяем, нужно ли заполнить очередь fallback-кандидатами
    let seededCount = 0;
    const currentTrendCount = await prisma.trendItem.count({
      where: {
        OR: [
          { status: "published" },
          { status: "queued", releaseAt: { lte: now } }
        ]
      }
    });

    if (currentTrendCount < 10) {
      seededCount = await seedTrendsFromVideo(now, source, currentTrendCount);
    }

    return {
      scanned: videos.length,
      candidates: candidates.length,
      queued: queuedCount,
      seeded: seededCount,
    };
  } catch (error) {
    await logAdminEvent({
      level: "error",
      type: "trend_db_scan_error",
      message: "Ошибка при сканировании базы для трендов",
      meta: safeMeta({
        error: error instanceof Error ? error.message : String(error),
        source,
      }),
    });

    return {
      scanned: 0,
      candidates: 0,
      queued: 0,
      seeded: 0,
    };
  }
}

/**
 * Оценивает ролик как потенциального трендового кандидата.
 */
function evaluateVideoAsCandidate(video: Video, now: Date): {
  video: Video;
  trendScore: number;
  reason: string;
} | null {
  const ageMs = now.getTime() - video.publishedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  let baseTrendScore = Math.max(video.rating, video.score);
  let reason = "";
  let qualifies = false;

  // A) Горячий ролик до 3 дней
  if (ageDays <= 3) {
    if (
      (video.rating >= 70 || video.score >= 70) &&
      (video.views >= 10_000 || video.viewsPerHour > 0)
    ) {
      qualifies = true;
      reason = "Сильный рост за 3 дня";
      baseTrendScore += 15; // Бонус за свежесть
    }

    // Дополнительный критерий для горячих роликов
    if (video.followerCount && video.followerCount > 0 && video.views / video.followerCount >= 3) {
      qualifies = true;
      if (!reason) reason = "Высокие просмотры относительно размера аккаунта";
      baseTrendScore += 10;
    }
  }

  // B) Сильный ролик недели
  if (!qualifies && ageDays <= 7) {
    if (video.rating >= 70 && video.views >= 30_000) {
      qualifies = true;
      reason = "Сильный ролик недели";
      baseTrendScore += 8;

      if (video.followerCount && video.followerCount > 0 && video.views / video.followerCount >= 5) {
        baseTrendScore += 8;
      }
    }
  }

  // C) Сильный ролик месяца
  if (!qualifies && ageDays <= 30) {
    if (video.rating >= 82 && video.views >= 100_000) {
      qualifies = true;
      reason = "Сильный ролик месяца";
      baseTrendScore += 5;

      if (video.followerCount && video.followerCount > 0 && video.views / video.followerCount >= 10) {
        baseTrendScore += 10;
      }
    }
  }

  if (!qualifies) {
    return null;
  }

  // Дополнительные бонусы
  if (video.viewsPerHour > 1000) {
    baseTrendScore += Math.min(10, Math.log10(video.viewsPerHour));
  }

  if (video.engagementRate > 0.05) {
    baseTrendScore += Math.min(8, video.engagementRate * 100);
  }

  if (video.shares > 100) {
    baseTrendScore += Math.min(5, Math.log10(video.shares));
  }

  if (video.comments > video.views * 0.02) {
    baseTrendScore += 3;
    if (!reason.includes("вовлечения")) {
      reason += " + много вовлечения";
    }
  }

  if (video.retentionRate && video.retentionRate > 0.7) {
    baseTrendScore += 5;
  }

  // Clamp score 0–99
  const trendScore = Math.min(99, Math.max(0, Math.round(baseTrendScore)));

  return {
    video,
    trendScore,
    reason: reason.trim(),
  };
}

/**
 * Заполняет очередь трендов из топ роликов базы Video (fallback).
 */
async function seedTrendsFromVideo(now: Date, source: string, currentCount: number): Promise<number> {
  try {
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await logAdminEvent({
      level: "info",
      type: "trend_seed_from_video_started",
      message: "Запуск заполнения очереди трендов из базы Video",
      meta: safeMeta({
        currentTrendCount: currentCount,
        source,
      }),
    });

    // Получаем топ ролики из базы по критериям старого /api/videos/trending
    const topVideos = await prisma.video.findMany({
      where: {
        views: { gte: 500 },
        thumbnailUrl: { not: null },
        durationSeconds: { lte: 60 },
      },
      orderBy: [
        { rating: "desc" },
        { score: "desc" },
        { viewsPerHour: "desc" },
        { views: "desc" }
      ],
      take: 20, // Берем больше для запаса
    });

    if (topVideos.length === 0) {
      await logAdminEvent({
        level: "info",
        type: "trend_seed_from_video_skipped",
        message: "Не найдено подходящих роликов для заполнения очереди",
        meta: safeMeta({ source }),
      });
      return 0;
    }

    let seededCount = 0;
    const needed = Math.min(15, topVideos.length); // Максимум 15 роликов
    let publishedCount = 0;
    let queuedCount = 0;

    for (let i = 0; i < needed; i++) {
      const video = topVideos[i];
      
      try {
        // Проверяем, нет ли уже такого ролика в TrendItem
        const existing = await prisma.trendItem.findUnique({
          where: { videoId: video.id },
        });

        if (existing) continue;

        // Первые 10 делаем published, остальные queued
        const isPublished = publishedCount < 10;
        const releaseAt = isPublished ? now : new Date(now.getTime() + (queuedCount + 1) * 10 * 60 * 1000); // +10 мин за каждый

        await prisma.trendItem.create({
          data: {
            videoId: video.id,
            status: isPublished ? "published" : "queued",
            trendScore: Math.max(video.rating, video.score),
            reason: "Топ ролик базы",
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

        seededCount++;
        if (isPublished) {
          publishedCount++;
        } else {
          queuedCount++;
        }

      } catch (error) {
        console.error("Failed to seed trend item:", error);
      }
    }

    await logAdminEvent({
      level: "info",
      type: "trend_seed_from_video_finished",
      message: "Завершено заполнение очереди трендов из базы Video",
      meta: safeMeta({
        videosProcessed: needed,
        seededCount,
        publishedCount,
        queuedCount,
        source,
      }),
    });

    return seededCount;
  } catch (error) {
    await logAdminEvent({
      level: "error",
      type: "trend_seed_from_video_error",
      message: "Ошибка при заполнении очереди трендов из Video",
      meta: safeMeta({
        error: error instanceof Error ? error.message : String(error),
        source,
      }),
    });
    return 0;
  }
}