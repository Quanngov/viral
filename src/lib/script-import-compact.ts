import type { SavedVideo } from "@prisma/client";

const MAX = 1600;

/** Компактное описание сохранённого ролика для контекста модели (без raw JSON). */
export function compactSavedVideoForContext(v: SavedVideo): string {
  const lines: string[] = [
    `[Сохранённый ролик] id=${v.id}`,
    `title: ${v.title}`,
    `platform: ${v.platform}`,
  ];
  const author = v.authorDisplayName?.trim() || v.authorUsername?.trim();
  if (author) lines.push(`author: ${author}`);
  if (v.views != null) lines.push(`views: ${v.views}`);
  if (v.likes != null) lines.push(`likes: ${v.likes}`);
  if (v.comments != null) lines.push(`comments: ${v.comments}`);
  if (v.shares != null) lines.push(`shares: ${v.shares}`);
  if (v.rating != null) lines.push(`rating: ${v.rating}`);
  if (v.durationSeconds != null && v.durationSeconds > 0) {
    lines.push(`durationSeconds: ${v.durationSeconds}`);
    lines.push(`videoDuration: ${v.durationSeconds}s`);
  }
  if (v.publishedAt) lines.push(`publishedAt: ${v.publishedAt.toISOString()}`);
  if (v.url) lines.push(`url: ${v.url}`);
  if (v.videoUrl) lines.push(`videoUrl: ${v.videoUrl}`);
  if (v.description?.trim()) {
    const d = v.description.trim().replace(/\s+/g, " ");
    lines.push(`description: ${d.slice(0, 600)}${d.length > 600 ? "…" : ""}`);
  }
  const text = lines.join("\n");
  return text.length > MAX ? `${text.slice(0, MAX)}…` : text;
}
