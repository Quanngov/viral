import "server-only";

import {
  HOME_SSR_LIMIT,
  TRENDS_SSR_LIMIT,
  type DashboardInitialPayload,
} from "@/lib/dashboard-initial";
import { queryHomeVideoCards } from "@/lib/queries/dashboard-home";
import { queryRealtimeTrendsPayload } from "@/lib/queries/dashboard-trends";

/** Above-the-fold fetch for SSR (same shape as client API). */
export async function fetchDashboardInitialPayload(): Promise<DashboardInitialPayload> {
  // Sequential: Supabase pooler uses connection_limit=1; parallel Prisma calls deadlock the pool.
  const homeVideos = await queryHomeVideoCards(HOME_SSR_LIMIT);
  const trends = await queryRealtimeTrendsPayload(TRENDS_SSR_LIMIT);
  return { homeVideos, trends };
}
