import { NextResponse } from "next/server";
import type { ApiErrorBody } from "@/lib/api-types";
import { logAdminEvent, safeMeta } from "@/lib/admin-events";
import { captureApiRouteError } from "@/lib/sentry";
import { logRouteError } from "@/lib/server-log";
import {
  runWithPerfContextSnapshot,
  isPerfAuditEnabled,
  isPerfTraceEnabled,
} from "@/lib/perf/perf-context";
import { ensurePerfServerInit } from "@/lib/perf/server-init";

export type RouteHandler = (
  req: Request,
  ctx?: { params?: Promise<Record<string, string>> },
) => Promise<NextResponse>;

/**
 * Top-level try/catch + structured error JSON. Does not change successful response bodies.
 */
export function withApiRoute(routeId: string, handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      ensurePerfServerInit();
      const { result: res, perf } = await runWithPerfContextSnapshot(
        routeId,
        async () => await handler(req, ctx),
      );
      if (perf && isPerfAuditEnabled()) {
        const ms = Math.round((perf.endedAtMs ?? performance.now()) - perf.startedAtMs);
        res.headers.set("x-perf-ms", String(ms));
        res.headers.set("x-perf-prisma-queries", String(perf.prismaQueryCount));
        res.headers.set("x-perf-prisma-ms", String(Math.round(perf.prismaTotalMs)));
        res.headers.set("x-perf-external-calls", String(perf.externalCallCount));
        if (perf.prismaSlowQueries.length > 0) {
          const top = perf.prismaSlowQueries
            .slice(0, 3)
            .map((q) => {
              const label = q.model && q.operation ? `${q.model}.${q.operation}` : "query";
              return `${label}:${Math.round(q.durationMs)}ms`;
            })
            .join(",");
          res.headers.set("x-perf-prisma-slow-top", top);
        }
        if (isPerfTraceEnabled() && perf.prismaTrace.length > 0) {
          const trace = perf.prismaTrace.map((q) => ({
            q: q.model && q.operation ? `${q.model}.${q.operation}` : "raw",
            ms: Math.round(q.durationMs),
            rows: q.rows ?? null,
          }));
          res.headers.set(
            "x-perf-prisma-trace",
            Buffer.from(JSON.stringify(trace), "utf8").toString("base64"),
          );
        }
        // stdout summary for the audit run
        console.info(
          `[perf] ${routeId} ${ms}ms (prisma ${perf.prismaQueryCount}q/${Math.round(perf.prismaTotalMs)}ms, external ${perf.externalCallCount})`,
        );
      }
      return res;
    } catch (error) {
      logRouteError(routeId, error);
      captureApiRouteError(routeId, error);
      void logAdminEvent({
        level: "error",
        type: "api_route_error",
        message: `Route error: ${routeId}`,
        throttleKey: `api_route_error:${routeId}`,
        meta: safeMeta({
          route: routeId,
          error: error instanceof Error ? error.message : String(error),
        }),
      });
      return apiError("internal_error", 500, {
        message:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : "Внутренняя ошибка сервера",
      });
    }
  };
}

export function apiError(
  error: string,
  status: number,
  extra?: { message?: string },
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      success: false as const,
      error,
      ...(extra?.message ? { message: extra.message } : {}),
    },
    { status },
  );
}
