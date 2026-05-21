import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectTrendCandidates } from "@/lib/trends/detect-trend-candidates";
import { getPopularSearchTopics } from "@/lib/trends/get-popular-search-topics";
import { ensureTrendPool } from "@/lib/trends/ensure-trend-pool";
import { logAdminEvent, safeMeta } from "@/lib/admin-events";
import { ensureSessionUser } from "@/lib/token-wallet";
import { ingestYouTubeShortsForQuery } from "@/lib/feed/ingest-youtube";
import { searchInstagramReelsTikHub } from "@/lib/providers/tikhubInstagram";
import { upsertInstagramReelsFromTikHub } from "@/lib/feed/ingest-instagram";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DB_SCAN_THROTTLE_MINUTES = 15;
const LAZY_DISCOVERY_THROTTLE_HOURS = 6;

export async function POST() {
  try {
    const { userId, sessionKey } = await ensureSessionUser();
    const now = new Date();

    // 0. Всегда проверяем и заполняем пул трендов
    const poolResult = await ensureTrendPool({
      minPublished: 10,
      minTotal: 20,
      source: "lazy_refresh",
    });

    // 1. Проверить последний DB scan
    const lastDbScanState = await prisma.appRuntimeState.findUnique({
      where: { key: "trends_last_db_scan_at" },
    });

    const lastDbScanAt = lastDbScanState?.value
      ? new Date(lastDbScanState.value as string)
      : new Date(0);

    const dbScanMinutesAgo = (now.getTime() - lastDbScanAt.getTime()) / (1000 * 60);

    if (dbScanMinutesAgo < DB_SCAN_THROTTLE_MINUTES) {
      await logAdminEvent({
        level: "info",
        type: "trend_db_scan_skipped",
        message: "DB scan пропущен - слишком рано",
        sessionId: sessionKey,
        userId,
        meta: safeMeta({
          lastScanMinutesAgo: Math.round(dbScanMinutesAgo * 100) / 100,
          throttleMinutes: DB_SCAN_THROTTLE_MINUTES,
        }),
      });

      return NextResponse.json({
        skipped: true,
        reason: "db_scan_throttled",
        lastDbScanMinutesAgo: Math.round(dbScanMinutesAgo),
      });
    }

    // 2. Запустить DB scan
    await logAdminEvent({
      level: "info",
      type: "trend_lazy_refresh_started",
      message: "Запуск ленивого обновления трендов",
      sessionId: sessionKey,
      userId,
    });

    const dbScanResult = await detectTrendCandidates("lazy_discovery");

    // Обновить время последнего DB scan
    await prisma.appRuntimeState.upsert({
      where: { key: "trends_last_db_scan_at" },
      update: { value: now.toISOString() },
      create: { key: "trends_last_db_scan_at", value: now.toISOString() },
    });

    // 3. Проверить, нужно ли делать внешний lazy discovery
    const lastLazyDiscoveryState = await prisma.appRuntimeState.findUnique({
      where: { key: "trends_last_lazy_discovery_at" },
    });

    const lastLazyDiscoveryAt = lastLazyDiscoveryState?.value
      ? new Date(lastLazyDiscoveryState.value as string)
      : new Date(0);

    const lazyDiscoveryHoursAgo = (now.getTime() - lastLazyDiscoveryAt.getTime()) / (1000 * 60 * 60);

    let externalDiscoveryResult: {
      attempted: boolean;
      reason?: string;
      youtubeSaved?: number;
      instagramSaved?: number;
      error?: string;
      postIngestSeeded?: number;
    } = { attempted: false };

    if (lazyDiscoveryHoursAgo >= LAZY_DISCOVERY_THROTTLE_HOURS) {
      // Проверяем популярные топики
      const popularTopics = await getPopularSearchTopics(5);

      if (popularTopics.length === 0) {
        await logAdminEvent({
          level: "info",
          type: "trend_popular_topics_empty",
          message: "Нет популярных топиков для lazy discovery",
          sessionId: sessionKey,
          userId,
        });

        externalDiscoveryResult = {
          attempted: false,
          reason: "no_popular_topics",
        };
      } else {
        // Получаем индекс текущего топика для ротации
        const topicIndexState = await prisma.appRuntimeState.findUnique({
          where: { key: "trends_discovery_topic_index" },
        });

        const currentIndex = topicIndexState?.value
          ? (topicIndexState.value as number) % popularTopics.length
          : 0;

        const selectedTopic = popularTopics[currentIndex];
        const nextIndex = (currentIndex + 1) % popularTopics.length;

        await logAdminEvent({
          level: "info",
          type: "trend_popular_topics_used",
          message: "Используется популярный топик для discovery",
          sessionId: sessionKey,
          userId,
          meta: safeMeta({
            selectedTopic,
            topicIndex: currentIndex,
            totalTopics: popularTopics.length,
          }),
        });

        // Обновляем индекс для следующего раза
        await prisma.appRuntimeState.upsert({
          where: { key: "trends_discovery_topic_index" },
          update: { value: nextIndex },
          create: { key: "trends_discovery_topic_index", value: nextIndex },
        });

        // Запускаем внешний discovery
        try {
          const ytKey = process.env.YOUTUBE_API_KEY?.trim();
          const tikhubToken = process.env.TIKHUB_TOKEN?.trim();

          let youtubeSaved = 0;
          let instagramSaved = 0;

          // YouTube discovery
          if (ytKey) {
            try {
              const ytResult = await ingestYouTubeShortsForQuery({
                q: selectedTopic,
                apiKey: ytKey,
                region: "",
                language: "",
                period: "week",
                sort: "views_desc",
                minViews: 10000,
              });
              youtubeSaved = "saved" in ytResult ? ytResult.saved : 0;
            } catch (ytError) {
              console.error("YouTube discovery error:", ytError);
            }
          }

          // Instagram discovery
          if (tikhubToken) {
            try {
              const igResult = await searchInstagramReelsTikHub(selectedTopic);
              if (igResult.reels.length > 0) {
                instagramSaved = await upsertInstagramReelsFromTikHub(
                  igResult.reels,
                  selectedTopic,
                  igResult.cacheUrl
                );
              }
            } catch (igError) {
              console.error("Instagram discovery error:", igError);
            }
          }

          externalDiscoveryResult = {
            attempted: true,
            youtubeSaved,
            instagramSaved,
          };

          // Обновляем время последнего external ingest если что-то сохранилось
          if (youtubeSaved > 0 || instagramSaved > 0) {
            await prisma.appRuntimeState.upsert({
              where: { key: "trends_last_external_ingest_at" },
              update: { value: now.toISOString() },
              create: { key: "trends_last_external_ingest_at", value: now.toISOString() },
            });

            // Запускаем еще один DB scan после внешнего ingest
            const postIngestResult = await detectTrendCandidates("lazy_discovery");
            externalDiscoveryResult.postIngestSeeded = postIngestResult.seeded;
          }

          // Обновляем время последнего lazy discovery
          await prisma.appRuntimeState.upsert({
            where: { key: "trends_last_lazy_discovery_at" },
            update: { value: now.toISOString() },
            create: { key: "trends_last_lazy_discovery_at", value: now.toISOString() },
          });

          await logAdminEvent({
            level: "info",
            type: "trend_lazy_discovery_finished",
            message: "Завершен внешний discovery для трендов",
            sessionId: sessionKey,
            userId,
            meta: safeMeta({
              selectedTopic,
              youtubeSaved,
              instagramSaved,
              hasYouTubeKey: Boolean(ytKey),
              hasTikHubToken: Boolean(tikhubToken),
            }),
          });
        } catch (error) {
          externalDiscoveryResult = {
            attempted: true,
            error: error instanceof Error ? error.message : String(error),
          };

          await logAdminEvent({
            level: "error",
            type: "trend_lazy_discovery_error",
            message: "Ошибка при внешнем discovery",
            sessionId: sessionKey,
            userId,
            meta: safeMeta({
              selectedTopic,
              error: error instanceof Error ? error.message : String(error),
            }),
          });
        }
      }
    } else {
      await logAdminEvent({
        level: "info",
        type: "trend_lazy_discovery_skipped",
        message: "Внешний discovery пропущен - слишком рано",
        sessionId: sessionKey,
        userId,
        meta: safeMeta({
          lastDiscoveryHoursAgo: Math.round(lazyDiscoveryHoursAgo * 100) / 100,
          throttleHours: LAZY_DISCOVERY_THROTTLE_HOURS,
        }),
      });

      externalDiscoveryResult = {
        attempted: false,
        reason: "discovery_throttled",
      };
    }

    return NextResponse.json({
      pool: poolResult,
      dbScan: {
        executed: true,
        scanned: dbScanResult.scanned,
        candidates: dbScanResult.candidates,
        queued: dbScanResult.queued,
        seeded: dbScanResult.seeded,
      },
      externalDiscovery: externalDiscoveryResult,
    });
  } catch (error) {
    console.error("Lazy refresh error:", error);

    void logAdminEvent({
      level: "error",
      type: "trend_lazy_refresh_error",
      message: "Критическая ошибка при lazy refresh",
      throttleKey: "trend_lazy_refresh_error",
      meta: safeMeta({
        error: error instanceof Error ? error.message : String(error),
      }),
    });

    return NextResponse.json({
      ok: false,
      error: "internal_error",
      message: "Ошибка при обновлении трендов",
    });
  }
}