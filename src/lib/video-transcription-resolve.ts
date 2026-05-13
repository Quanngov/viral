import type { Video } from "@prisma/client";

function pushUnique(arr: string[], u: string | null | undefined) {
  const s = u?.trim();
  if (!s || !/^https?:\/\//i.test(s)) return;
  if (!arr.includes(s)) arr.push(s);
}

export function parseVideoUsefulRaw(raw: string | null): Record<string, unknown> | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (o && typeof o === "object" && !Array.isArray(o)) return o as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

/** Прямой URL mp4/видео: колонка Video или usefulRaw (video_url / video_versions). */
export function resolvePlayableVideoUrl(video: Video): string | null {
  const col = video.videoUrl?.trim();
  if (col && /^https?:\/\//i.test(col)) return col;
  const obj = parseVideoUsefulRaw(video.usefulRaw);
  if (!obj) return null;
  const vu = obj.video_url;
  if (typeof vu === "string" && vu.trim().startsWith("http")) return vu.trim();
  const vers = obj.video_versions;
  if (Array.isArray(vers)) {
    for (const x of vers) {
      if (!x || typeof x !== "object") continue;
      const u = (x as Record<string, unknown>).url;
      if (typeof u === "string" && u.trim().startsWith("http")) return u.trim();
    }
  }
  return null;
}

function walkForSubtitleUrls(v: unknown, depth: number, out: string[], keyHint?: string): void {
  if (depth > 12) return;
  if (typeof v === "string") {
    if (!/^https?:\/\//i.test(v)) return;
    const k = (keyHint ?? "").toLowerCase();
    if (/\.(srt|vtt)(\?|$)/i.test(v)) {
      pushUnique(out, v);
      return;
    }
    if (/subtitle|caption|translat/i.test(k) && v.length < 4000) pushUnique(out, v);
    return;
  }
  if (Array.isArray(v)) {
    for (const x of v) walkForSubtitleUrls(x, depth + 1, out);
    return;
  }
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      walkForSubtitleUrls(val, depth + 1, out, k);
    }
  }
}

function pushTranslatedSubtitleUris(obj: Record<string, unknown>, out: string[]): void {
  const raw = obj.translated_video_subtitles;
  if (!Array.isArray(raw)) return;
  for (const el of raw.slice(0, 5)) {
    if (!el || typeof el !== "object") continue;
    const o = el as Record<string, unknown>;
    const uri = o.uri ?? o.url ?? o.subtitle_uri;
    if (typeof uri === "string") pushUnique(out, uri);
  }
}

/** Все кандидаты URI субтитров для транскрибации. */
export function listTranscriptionSubtitleUris(video: Video): string[] {
  const out: string[] = [];
  pushUnique(out, video.subtitlesUrl);
  const obj = parseVideoUsefulRaw(video.usefulRaw);
  if (obj) {
    const direct = obj.video_subtitles_uri;
    if (typeof direct === "string") pushUnique(out, direct);
    pushTranslatedSubtitleUris(obj, out);
    walkForSubtitleUrls(obj, 0, out);
  }
  return out;
}

/** Shortcode из permalink Instagram (reel / p / reels / tv). */
export function extractInstagramShortcodeFromUrl(u: string | null | undefined): string | null {
  if (!u?.trim()) return null;
  const m = u.trim().match(/instagram\.com\/(?:reel|p|reels|tv)\/([^/?#]+)/i);
  const s = m?.[1]?.trim();
  return s || null;
}

/**
 * Код ролика для TikHub get_post_info_by_code: usefulRaw, permalink, либо externalId,
 * если это не «чистый» числовой id (для таких остаётся только v2 по permalink из video.url).
 */
export function extractInstagramReelCodeFromVideo(video: Video): string | null {
  const raw = parseVideoUsefulRaw(video.usefulRaw);
  const fromRaw =
    (typeof raw?.code === "string" && raw.code.trim()) ||
    (typeof raw?.shortcode === "string" && raw.shortcode.trim()) ||
    null;
  if (fromRaw) return fromRaw;
  const fromPermalink = extractInstagramShortcodeFromUrl(video.url);
  if (fromPermalink) return fromPermalink;
  const ext = video.externalId?.trim();
  if (!ext) return null;
  if (/^\d+$/.test(ext)) return null;
  return ext;
}
