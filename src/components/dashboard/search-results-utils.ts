import type { GridVideo } from "@/lib/mock-data";
import type { ApiSort, FeedPlatformMode } from "@/lib/search-query";

export type SearchGridFilters = {
  languageMode: "world" | "ru" | "en";
  sort: ApiSort;
  period: "today" | "yesterday" | "week" | "month" | "year" | "all";
  minViews: 0 | 1000 | 10000 | 50000 | 100000 | 1000000;
  platformMode: FeedPlatformMode;
};

function parseViews(views: string): number {
  const s = views.trim().toUpperCase().replaceAll(" ", "").replaceAll(",", ".");
  const m = s.match(/^([\d.]+)([KMBКМ]?)$/);
  if (!m) {
    const n = Number(s.replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  const value = Number(m[1]);
  if (!Number.isFinite(value)) return 0;
  const suffix = m[2];
  if (suffix === "K" || suffix === "К") return Math.round(value * 1_000);
  if (suffix === "M" || suffix === "М") return Math.round(value * 1_000_000);
  if (suffix === "B") return Math.round(value * 1_000_000_000);
  return Math.round(value);
}

function getPublishedDate(v: GridVideo): Date | null {
  if (v.publishedAtIso) {
    const d = new Date(v.publishedAtIso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function isWithinPeriod(videoDate: Date | null, period: SearchGridFilters["period"]): boolean {
  if (period === "all" || !videoDate) return true;
  const now = new Date();
  const msDiff = now.getTime() - videoDate.getTime();
  switch (period) {
    case "today":
      return now.toDateString() === videoDate.toDateString();
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return y.toDateString() === videoDate.toDateString();
    }
    case "week":
      return msDiff <= 7 * 24 * 3600 * 1000;
    case "month":
      return msDiff <= 30 * 24 * 3600 * 1000;
    case "year":
      return msDiff <= 365 * 24 * 3600 * 1000;
    default:
      return true;
  }
}

function hasCyrillic(s: string): boolean {
  return /[А-Яа-яЁё]/.test(s);
}

export function applyVideoFilters(inputVideos: GridVideo[], active: SearchGridFilters): GridVideo[] {
  const list = [...inputVideos];
  const filtered = list.filter((v) => {
    if (active.platformMode !== "all") {
      const p = v.platform ?? "youtube";
      if (p !== active.platformMode) return false;
    }

    const views = parseViews(v.views);
    if (views < active.minViews) return false;

    if (!isWithinPeriod(getPublishedDate(v), active.period)) return false;

    if (active.languageMode !== "world") {
      const lang = (v.language ?? "").toLowerCase();
      const region = (v.region ?? "").toUpperCase();
      const text = `${v.title} ${v.description ?? ""} ${v.summary ?? ""} ${v.channel}`.trim();
      const cyr = hasCyrillic(text);
      if (active.languageMode === "ru") {
        if (lang || region) {
          if (!(lang === "ru" || region === "RU")) return false;
        } else if (!cyr) {
          return false;
        }
      } else if (active.languageMode === "en") {
        if (lang || region) {
          if (!(lang === "en" || region === "US")) return false;
        } else if (cyr) {
          return false;
        }
      }
    }

    return true;
  });

  filtered.sort((a, b) => {
    const av = parseViews(a.views);
    const bv = parseViews(b.views);
    const ad = getPublishedDate(a)?.getTime() ?? 0;
    const bd = getPublishedDate(b)?.getTime() ?? 0;
    const as = a.score ?? null;
    const bs = b.score ?? null;
    const aviral = a.viralScore ?? 0;
    const bviral = b.viralScore ?? 0;

    switch (active.sort) {
      case "views_desc":
        return bv - av;
      case "views_asc":
        return av - bv;
      case "date_desc":
        return bd - ad;
      case "date_asc":
        return ad - bd;
      case "viral_desc":
        if (as != null && bs != null) return bs - as;
        return bviral - aviral;
      case "viral_asc":
        if (as != null && bs != null) return as - bs;
        return aviral - bviral;
      default:
        return 0;
    }
  });

  return filtered;
}

function scoreValue(v: GridVideo): number {
  return typeof v.score === "number" ? v.score : 0;
}

export function buildDisplayOrder(inputVideos: GridVideo[]): GridVideo[] {
  if (inputVideos.length <= 1) return inputVideos;
  const byScore = new Map<number, GridVideo[]>();
  for (const v of inputVideos) {
    const s = scoreValue(v);
    const bucket = byScore.get(s);
    if (bucket) bucket.push(v);
    else byScore.set(s, [v]);
  }
  const orderedScores = Array.from(byScore.keys()).sort((a, b) => b - a);
  const out: GridVideo[] = [];
  for (const s of orderedScores) {
    out.push(...(byScore.get(s) ?? []).sort((a, b) => a.id.localeCompare(b.id)));
  }
  return out;
}
