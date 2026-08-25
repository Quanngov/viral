/**
 * Source of popular search queries shown above the video search input
 * (chips + animated placeholder).
 *
 * Real data comes from the server via `DashboardInitialPayload.popularSearchTopics`
 * (populated from `getPopularSearchTopics()` — real `SearchQueryLog` history).
 * This file only provides a small curated fallback and a merge helper so the
 * feature keeps working when the DB has no history yet.
 *
 * The fallback is intentionally isolated here so it can later be replaced by a
 * richer real-data source without touching the UI components.
 */

export const FALLBACK_POPULAR_QUERIES: string[] = [
  // Короткие
  "монтаж Reels",
  "Shorts идеи",
  "TikTok продвижение",
  "идеи для контента",
  "вирусные видео",
  "как увеличить охваты",
  "где искать клиентов",
  // Средние
  "как найти клиентов",
  "где брать клиентов",
  "как набрать просмотры",
  "как увеличить просмотры",
  "как делать вирусные видео",
  "как продвигать Reels",
  "как продвигать Shorts",
  "идеи для коротких видео",
  "как привлекать клиентов из соцсетей",
  "как найти клиентов на монтаж",
  "как найти клиентов на видеомонтаж",
  "как найти клиентов блогеру",
  "продвижение соцсетей",
  "лидогенерация через контент",
  // Длинные естественные формулировки
  "как найти клиентов через Instagram",
  "как продвигать короткие видео",
  "как набрать первые 10000 просмотров",
  "контент для привлечения клиентов",
  "Reels для привлечения клиентов",
  "Shorts для продвижения",
  "идеи Reels для бизнеса",
  "видеомонтаж заказы",
  "контент-маркетинг для блогера",
  "как монетизировать блог",
];

/**
 * Merges real server topics with the fallback, de-duplicated by lowercased text.
 * Real (server) topics lead the list so they surface first once the DB has data.
 */
export function buildPopularQueryPool(serverTopics: string[]): string[] {
  const seen = new Set<string>();
  const pool: string[] = [];
  for (const raw of [...serverTopics, ...FALLBACK_POPULAR_QUERIES]) {
    const q = raw.trim();
    const key = q.toLowerCase();
    if (!q || seen.has(key)) continue;
    seen.add(key);
    pool.push(q);
  }
  return pool;
}
