"use client";

import { useEffect, useState } from "react";
import {
  USE_LIVE_DAILY_VIDEOS_COUNT,
  dailyVideosCountSource,
  getDeterministicDailyVideosCount,
} from "@/components/landing/lib/daily-activity-count";

/**
 * Landing daily counter hook.
 * Today: deterministic mock (800–2300, stable per UTC day).
 * Later: flip `USE_LIVE_DAILY_VIDEOS_COUNT` and implement `fetchLiveDailyVideosCount`.
 */
export function useDailyVideosAnalyzedCount(): number {
  const [count, setCount] = useState(() => dailyVideosCountSource.getSyncCount());

  useEffect(() => {
    if (!USE_LIVE_DAILY_VIDEOS_COUNT || !dailyVideosCountSource.fetchLiveCount) return;

    let cancelled = false;
    void dailyVideosCountSource.fetchLiveCount().then((live) => {
      if (!cancelled && live != null && Number.isFinite(live)) {
        setCount(Math.max(0, Math.floor(live)));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return count;
}

export { getDeterministicDailyVideosCount };
