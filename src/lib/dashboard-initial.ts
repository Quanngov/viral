import type { GridVideo } from "@/lib/mock-data";
import type { TrendsPayload } from "@/lib/dashboard-fetch";

/** Serialized above-the-fold payload from the server page. */
export type DashboardInitialPayload = {
  homeVideos: GridVideo[];
  trends: TrendsPayload;
};

export const HOME_SSR_LIMIT = 12;
export const TRENDS_SSR_LIMIT = 10;
