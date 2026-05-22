import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { withTimedRoute } from "@/lib/api-timing";
import { logInfo } from "@/lib/server-log";
import { queryHomeVideoCards, queryHomeVideoCount } from "@/lib/queries/dashboard-home";

export const dynamic = "force-dynamic";

export const GET = withTimedRoute(
  "videos.home.GET",
  withApiRoute("videos.home.GET", async (req) => {
    const { searchParams } = new URL(req.url);
    const countOnly = searchParams.get("countOnly") === "1";

    if (countOnly) {
      const tc0 = performance.now();
      const totalCount = await queryHomeVideoCount();
      const countMs = Math.round(performance.now() - tc0);
      if (countMs >= 200) logInfo("db", "videos.home.count", { countMs });
      const res = NextResponse.json({ totalCount });
      res.headers.set("Server-Timing", `count;dur=${countMs}`);
      return res;
    }

    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 8));
    const skip = Math.max(0, Number(searchParams.get("skip")) || 0);

    const t0 = performance.now();
    const videos = await queryHomeVideoCards(limit, skip);
    const findMs = Math.round(performance.now() - t0);

    if (findMs >= 200) {
      logInfo("db", "videos.home.find", { findMs, limit, skip });
    }

    const res = NextResponse.json({ videos });
    res.headers.set("Server-Timing", `find;dur=${findMs}`);
    return res;
  }),
);
