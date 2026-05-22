import "server-only";

import {
  HOME_SSR_LIMIT,
  TRENDS_SSR_LIMIT,
  type DashboardInitialPayload,
} from "@/lib/dashboard-initial";
import { queryHomeVideoCards } from "@/lib/queries/dashboard-home";
import { queryRealtimeTrendsPayload } from "@/lib/queries/dashboard-trends";

/** Parallel above-the-fold fetch for SSR (same shape as client API). */
export async function fetchDashboardInitialPayload(): Promise<DashboardInitialPayload> {
  const [homeVideos, trends] = await Promise.all([
    queryHomeVideoCards(HOME_SSR_LIMIT),
    queryRealtimeTrendsPayload(TRENDS_SSR_LIMIT),
  ]);
  return { homeVideos, trends };
}
