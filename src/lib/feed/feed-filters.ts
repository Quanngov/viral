import type { Video } from "@prisma/client";
import type { PeriodApi, FeedPlatformMode } from "@/lib/search-query";
import { isPublishedWithinPeriod } from "@/lib/period-filter";
import { videoRowHasDisplayableThumbnail } from "@/lib/thumbnail-pipeline";

export type FeedLanguageMode = "world" | "ru" | "en";

export type FeedFilterPayload = {
  q: string;
  period: PeriodApi;
  minViews: number;
  languageMode: FeedLanguageMode;
  platform: FeedPlatformMode;
};

function hasCyrillic(s: string): boolean {
  return /[А-Яа-яЁё]/.test(s);
}

function textHay(v: Video): string {
  return `${v.title} ${v.description ?? ""} ${v.channelTitle ?? ""} ${v.authorUsername ?? ""} ${v.sourceQuery ?? ""}`.toLowerCase();
}

export function videoMatchesSearchQuery(v: Video, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const hay = textHay(v);
  if (hay.includes(t)) return true;
  const words = [...new Set(t.split(/\s+/).filter((w) => w.length >= 2))];
  if (words.length === 0) return true;
  return words.some((w) => hay.includes(w));
}

export function videoMatchesLanguage(v: Video, mode: FeedLanguageMode): boolean {
  if (mode === "world") return true;
  const lang = (v.language ?? "").toLowerCase();
  const region = (v.region ?? "").toUpperCase();
  const text = textHay(v);
  const cyr = hasCyrillic(text);
  if (mode === "ru") {
    if (lang || region) {
      return lang === "ru" || region === "RU";
    }
    return cyr;
  }
  if (mode === "en") {
    if (lang || region) {
      return lang === "en" || region === "US";
    }
    return !cyr;
  }
  return true;
}

export function videoMatchesPlatform(v: Video, mode: FeedPlatformMode): boolean {
  if (mode === "all") return true;
  return v.platform === mode;
}

export function videoMatchesFeedFilters(v: Video, f: FeedFilterPayload, now = new Date()): boolean {
  if (!videoRowHasDisplayableThumbnail(v)) return false;
  if (!videoMatchesPlatform(v, f.platform)) return false;
  if (v.views < f.minViews) return false;
  if (!isPublishedWithinPeriod(v.publishedAt, f.period, now)) return false;
  if (!videoMatchesSearchQuery(v, f.q)) return false;
  if (!videoMatchesLanguage(v, f.languageMode)) return false;
  return true;
}
