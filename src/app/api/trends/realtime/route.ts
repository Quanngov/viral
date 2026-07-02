import { NextResponse } from "next/server";
import { withTimedRoute } from "@/lib/api-timing";
import { queryRealtimeTrendsPayload } from "@/lib/queries/dashboard-trends";
import { logAdminEvent, safeMeta } from "@/lib/admin-events";
import { captureApiRouteError } from "@/lib/sentry";
import { logInfo, logRouteError } from "@/lib/server-log";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Poll publishes due queued trends (max 1) and returns the live published list. */
export const GET = withTimedRoute("trends.realtime.GET", async (req) => {
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.min(20, Math.max(1, parseInt(limitParam, 10))) : 10;

    const t0 = performance.now();
    const { trends, newItems } = await queryRealtimeTrendsPayload(limit);
    const dbMs = Math.round(performance.now() - t0);
    if (dbMs >= 200) logInfo("db", "trends.realtime", { dbMs, limit });

    return NextResponse.json({
      trends,
      newItems,
      meta: {
        totalPublished: trends.length,
        newItemsCount: newItems.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logRouteError("trends.realtime", error);
    captureApiRouteError("trends.realtime", error);

    void logAdminEvent({
      level: "error",
      type: "trend_realtime_error",
      message: "Ошибка при получении realtime трендов",
      throttleKey: "trend_realtime_error",
      meta: safeMeta({
        error: error instanceof Error ? error.message : String(error),
      }),
    });

    return NextResponse.json(
      {
        error: "internal_error",
        message: "Ошибка при загрузке трендов",
      },
      { status: 500 },
    );
  }
});
