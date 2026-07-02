/** Deterministic daily count for landing hero (1000–2000). Replaced by real analytics later. */
export function getDailyVideosAnalyzedCount(date = new Date()): number {
  const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (Math.imul(31, hash) + dateKey.charCodeAt(i)) >>> 0;
  }
  return 1000 + (hash % 1001);
}

export function formatDailyVideosAnalyzedCount(count: number, locale = "ru-RU"): string {
  return count.toLocaleString(locale);
}
