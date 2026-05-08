const GARBAGE = ["music", "song", "lyrics", "full movie", "episode", "stream", "live", "asmr"];

export function hasGarbageKeywords(title: string, description: string): boolean {
  const t = `${title} ${description}`.toLowerCase();
  return GARBAGE.some((k) => t.includes(k));
}

/** Значимые слова запроса (длина ≥ 3). */
export function significantQueryWords(query: string): string[] {
  const qNorm = query.toLowerCase().replace(/\s+/g, " ").trim();
  const words = qNorm.split(/\s+/).filter((w) => w.length >= 3);
  return [...new Set(words)];
}

/**
 * Релевантность 0–1: точная фраза → 1; иначе по доле совпавших слов.
 */
export function computeRelevanceScore(
  query: string,
  title: string,
  description: string,
  channelTitle: string,
): number {
  const qNorm = query.toLowerCase().replace(/\s+/g, " ").trim();
  const hay = `${title} ${description} ${channelTitle}`.toLowerCase();
  if (!qNorm) return 0;
  if (hay.includes(qNorm)) return 1;

  const words = significantQueryWords(query);
  if (words.length === 0) return 0;

  let matched = 0;
  for (const w of words) {
    if (hay.includes(w)) matched++;
  }
  if (matched === 0) return 0;

  const ratio = matched / words.length;
  if (ratio >= 0.66) return 0.8 + Math.min(0.2, ((ratio - 0.66) / 0.34) * 0.2);
  return 0.4 + (ratio / 0.66) * 0.35;
}

export function computeRawScoreCore(
  views: number,
  viewsPerHour: number,
  engagementRate: number,
  relevanceScore: number,
): number {
  return (
    Math.log10(views + 1) * 0.25 +
    Math.log10(viewsPerHour + 1) * 0.45 +
    Math.min(engagementRate / 0.08, 1) * 1.2 +
    relevanceScore * 1.5
  );
}

export function applyGarbagePenalty(rawScore: number): number {
  return rawScore * 0.7;
}

/** Нормализация rawScore → score 1–99 внутри текущей выдачи. */
export function normalizeScores1to99(rawScores: number[]): number[] {
  if (rawScores.length === 0) return [];
  const minR = Math.min(...rawScores);
  const maxR = Math.max(...rawScores);
  const span = Math.max(maxR - minR, 0.0001);
  return rawScores.map((r) => Math.round(1 + ((r - minR) / span) * 98));
}
