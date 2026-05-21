import { NextResponse } from "next/server";
import type { ApiErrorBody } from "@/lib/api-types";
import { logAdminEvent, safeMeta } from "@/lib/admin-events";
import { captureApiRouteError } from "@/lib/sentry";
import { logRouteError } from "@/lib/server-log";

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
      return await handler(req, ctx);
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
        message: "Внутренняя ошибка сервера",
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
