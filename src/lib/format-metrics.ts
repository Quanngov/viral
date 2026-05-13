import { formatViewsCount } from "@/lib/format-video";

/** Просмотры, лайки, комментарии, шеры — компактно: 1.2M, 340K, 12K, 950 */
export function formatMetricCount(n: number): string {
  return formatViewsCount(Math.max(0, Math.floor(n)));
}

/** Внутренние токены: «12 400» (неразрывные пробелы по тысячам). */
export function formatTokensRuSpace(n: number): string {
  const v = Math.max(0, Math.floor(n));
  return v.toLocaleString("ru-RU").replace(/\u00a0/g, " ");
}

/** Оценка 0–99 для UI. */
export function formatRatingInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const x = Math.round(n);
  return String(Math.min(99, Math.max(0, x)));
}
