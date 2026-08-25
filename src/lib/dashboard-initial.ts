import type { GridVideo } from "@/lib/mock-data";
import type { TrendsPayload } from "@/lib/dashboard-fetch";

/** Serialized above-the-fold payload from the server page. */
export type DashboardInitialPayload = {
  homeVideos: GridVideo[];
  trends: TrendsPayload;
  /** Real popular search queries (last 14 days) for the search UI chips/placeholder. */
  popularSearchTopics: string[];
};

export const HOME_SSR_LIMIT = 8;
export const TRENDS_SSR_LIMIT = 10;
