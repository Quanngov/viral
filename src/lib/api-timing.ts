import "server-only";

import { NextResponse } from "next/server";
import { logInfo } from "@/lib/server-log";
import type { RouteHandler } from "@/lib/api-route";

const SLOW_MS = 400;

/** Logs route duration; adds Server-Timing when slow. */
export function withTimedRoute(routeId: string, handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const t0 = performance.now();
    const res = await handler(req, ctx);
    const ms = Math.round(performance.now() - t0);
    if (ms >= SLOW_MS) {
      logInfo("api", "slow_route", { routeId, ms });
    }
    if (res instanceof NextResponse) {
      res.headers.set("Server-Timing", `app;dur=${ms}`);
    }
    return res;
  };
}
