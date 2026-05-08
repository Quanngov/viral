import type { PeriodApi } from "@/lib/search-query";

/** Границы периода для фильтрации publishedAt (локально после API). */
export function isPublishedWithinPeriod(date: Date, period: PeriodApi, now = new Date()): boolean {
  const startUtc = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));

  const t = date.getTime();

  switch (period) {
    case "all":
      return true;
    case "today":
      return t >= startUtc(now).getTime() && t <= now.getTime();
    case "yesterday": {
      const y = new Date(now);
      y.setUTCDate(y.getUTCDate() - 1);
      const s = startUtc(y).getTime();
      const e = startUtc(now).getTime() - 1;
      return t >= s && t <= e;
    }
    case "week":
      return t >= now.getTime() - 7 * 24 * 3600 * 1000 && t <= now.getTime();
    case "month":
      return t >= now.getTime() - 30 * 24 * 3600 * 1000 && t <= now.getTime();
    case "year":
      return t >= now.getTime() - 365 * 24 * 3600 * 1000 && t <= now.getTime();
    default:
      return true;
  }
}
