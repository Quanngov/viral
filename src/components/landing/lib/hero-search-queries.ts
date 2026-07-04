/** Realistic queries for the hero typing animation (ViralCloud user style). */
export const HERO_SEARCH_QUERIES = [
  "идеи для рилс про недвижимость",
  "вирусные ролики про фитнес",
  "монтаж reels",
  "хуки для экспертов",
  "reels для стоматолога",
  "идеи для онлайн-школы",
  "вирусные видео про инвестиции",
  "shorts про искусственный интеллект",
  "конкуренты в нише психологии",
  "reels с миллионом просмотров",
  "лучшие ролики про маркетинг",
  "новые тренды TikTok",
] as const;

/** Per-character typing delay (ms) — varies by character for a natural rhythm. */
export function heroSearchCharDelayMs(char: string, index: number): number {
  const base = 32 + (index % 5) * 4;
  if (char === " ") return base + 28;
  if (char === "," || char === "—" || char === "-") return base + 55;
  if (/[а-яё]/i.test(char) && char.length === 1 && index > 0 && index % 7 === 0) return base + 18;
  return base;
}

/** Pause after a query finishes typing, before erasing/next (ms). */
export function heroSearchPauseAfterQueryMs(query: string): number {
  const len = query.length;
  if (len < 18) return 2200;
  if (len < 32) return 2800;
  return 3400;
}

/** Pause while "deleting" or between queries (ms). */
export const HERO_SEARCH_BETWEEN_QUERIES_MS = 420;
