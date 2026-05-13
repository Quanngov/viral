import { compactErrorMeta, logAdminEvent } from "@/lib/admin-events";

const TIKHUB_SEARCH_URL = "https://api.tikhub.io/api/v1/instagram/v2/search_reels";
const TIKHUB_USER_REELS_URL = "https://api.tikhub.io/api/v1/instagram/v2/fetch_user_reels";
const TIKHUB_POST_BY_CODE_V3 = "https://api.tikhub.io/api/v1/instagram/v3/get_post_info_by_code";
const TIKHUB_POST_INFO_V2 = "https://api.tikhub.io/api/v1/instagram/v2/fetch_post_info";
/** Обновление одного ролика перед транскрибацией. */
const TIMEOUT_MS_INSTAGRAM_SINGLE_POST = 18_000;
/** Таймаут для поиска Reels по ключевому слову (короткий). */
export const TIMEOUT_MS_INSTAGRAM_SEARCH = 14_000;
/** Таймаут для fetch_user_reels при конкурентах (длиннее). */
export const TIMEOUT_MS_INSTAGRAM_USER_REELS = 45_000;

export type NormalizedInstagramReel = {
  platform: "instagram";
  externalId: string;
  url: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  publishedAt: Date;
  durationSeconds: number;
  language: string | null;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  subtitlesUrl: string | null;
  followerCount: number | null;
  usefulRaw: string | null;
};

async function logTikHubIssue(kind: string, detail?: string, meta?: Record<string, unknown>) {
  const msg = detail ? `${kind}: ${detail}` : kind;
  console.warn(`[TikHub] ${msg}`);
  await logAdminEvent({
    level: kind.includes("error") || kind === "auth_error" ? "error" : "warn",
    type: "api_fetch",
    message: `TikHub Instagram · ${msg}`,
    meta: { provider: "tikhub_instagram", kind, ...(meta ?? {}) },
  });
}

function pickItems(json: unknown): unknown[] {
  if (!json || typeof json !== "object") return [];
  const root = json as Record<string, unknown>;
  const data = root.data;
  if (data && typeof data === "object") {
    const d1 = data as Record<string, unknown>;
    const inner = d1.data;
    if (inner && typeof inner === "object") {
      const d2 = inner as Record<string, unknown>;
      const items = d2.items;
      if (Array.isArray(items)) return items;
      const reels = d2.reels;
      if (Array.isArray(reels)) return reels;
    }
    const itemsTop = d1.items;
    if (Array.isArray(itemsTop)) return itemsTop;
    const reelsTop = d1.reels;
    if (Array.isArray(reelsTop)) return reelsTop;
  }
  return [];
}

/** Извлекает pagination_token из ответа TikHub v2 (без логирования значения). */
export function extractTikHubPaginationToken(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  const tryVal = (v: unknown): string | null => {
    const s = str(v);
    return s && s.length > 0 ? s : null;
  };
  const direct =
    tryVal(root.pagination_token) ??
    tryVal(root.paginationToken) ??
    tryVal(root.next_max_id);
  if (direct) return direct;
  const data = root.data;
  if (!data || typeof data !== "object") return null;
  const d1 = data as Record<string, unknown>;
  const fromD1 =
    tryVal(d1.pagination_token) ??
    tryVal(d1.paginationToken) ??
    tryVal(d1.next_max_id);
  if (fromD1) return fromD1;
  const inner = d1.data;
  if (!inner || typeof inner !== "object") return null;
  const d2 = inner as Record<string, unknown>;
  return (
    tryVal(d2.pagination_token) ??
    tryVal(d2.paginationToken) ??
    tryVal(d2.next_max_id) ??
    null
  );
}

export type TikHubUserReelsPageResult = {
  ok: boolean;
  httpStatus: number;
  reels: NormalizedInstagramReel[];
  paginationToken: string | null;
  /** Краткая метка для логов, без тела ответа */
  errorKind?: string;
};

export type TikHubUserReelsPageAttemptInfo = {
  attempt: 1 | 2;
  timeoutMs: number;
  result: TikHubUserReelsPageResult;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isUserReelsFetchRetryable(r: TikHubUserReelsPageResult): boolean {
  if (r.ok) return false;
  if (r.httpStatus === 401 || r.httpStatus === 402 || r.httpStatus === 403) return false;
  const k = r.errorKind ?? "";
  if (k === "tikhub_auth" || k === "tikhub_insufficient_balance" || k === "missing_token" || k === "empty_username") {
    return false;
  }
  if (k === "timeout" || r.httpStatus === 408) return true;
  if (r.httpStatus === 0) return true;
  return false;
}

/**
 * Один HTTP-запрос fetch_user_reels с заданным таймаутом (без retry).
 */
export async function fetchInstagramUserReelsTikHubPageOnce(
  username: string,
  paginationToken: string | null,
  timeoutMs: number,
): Promise<TikHubUserReelsPageResult> {
  const token = process.env.TIKHUB_TOKEN?.trim();
  if (!token) {
    return { ok: false, httpStatus: 503, reels: [], paginationToken: null, errorKind: "missing_token" };
  }

  const user = username.trim().replace(/^@/, "");
  if (!user) {
    return { ok: false, httpStatus: 400, reels: [], paginationToken: null, errorKind: "empty_username" };
  }

  const url = new URL(TIKHUB_USER_REELS_URL);
  url.searchParams.set("username", user);
  if (paginationToken) {
    url.searchParams.set("pagination_token", paginationToken);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { ok: false, httpStatus: res.status, reels: [], paginationToken: null, errorKind: "invalid_json" };
    }

    if (res.status === 402) {
      return { ok: false, httpStatus: 402, reels: [], paginationToken: null, errorKind: "tikhub_insufficient_balance" };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, httpStatus: res.status, reels: [], paginationToken: null, errorKind: "tikhub_auth" };
    }

    if (!res.ok) {
      const msg =
        typeof json === "object" && json && "message" in json
          ? String((json as { message?: unknown }).message).slice(0, 200)
          : res.statusText;
      return {
        ok: false,
        httpStatus: res.status,
        reels: [],
        paginationToken: null,
        errorKind: `http_${res.status}:${msg.slice(0, 80)}`,
      };
    }

    const items = pickItems(json);
    const reels: NormalizedInstagramReel[] = [];
    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue;
      const parsed = parseItem(raw as Record<string, unknown>);
      if (parsed) reels.push(parsed);
    }

    const next = extractTikHubPaginationToken(json);
    return { ok: true, httpStatus: res.status, reels, paginationToken: next };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, httpStatus: 408, reels: [], paginationToken: null, errorKind: "timeout" };
    }
    return {
      ok: false,
      httpStatus: 0,
      reels: [],
      paginationToken: null,
      errorKind: e instanceof Error ? `fetch:${e.name}` : "fetch_error",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * До 2 попыток (вторая только при timeout / сетевой ошибке), пауза 800–1200 ms между попытками.
 * Таймаут одной попытки — 45 с (конкуренты). Логирование — через onAttempt.
 */
export async function fetchInstagramUserReelsTikHubPageForCompetitor(
  username: string,
  paginationToken: string | null,
  onAttempt?: (info: TikHubUserReelsPageAttemptInfo) => void | Promise<void>,
): Promise<TikHubUserReelsPageResult> {
  const timeoutMs = TIMEOUT_MS_INSTAGRAM_USER_REELS;
  let result = await fetchInstagramUserReelsTikHubPageOnce(username, paginationToken, timeoutMs);
  await onAttempt?.({ attempt: 1, timeoutMs, result });
  if (result.ok || !isUserReelsFetchRetryable(result)) {
    return result;
  }
  await sleep(800 + Math.floor(Math.random() * 401));
  result = await fetchInstagramUserReelsTikHubPageOnce(username, paginationToken, timeoutMs);
  await onAttempt?.({ attempt: 2, timeoutMs, result });
  return result;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function pickVideoUrlFromItem(item: Record<string, unknown>): string | null {
  const direct = str(item.video_url);
  if (direct) return direct;
  const versions = item.video_versions as unknown[] | undefined;
  if (!Array.isArray(versions)) return null;
  for (const v of versions) {
    if (!v || typeof v !== "object") continue;
    const u = str((v as Record<string, unknown>).url);
    if (u) return u;
  }
  return null;
}

function compactTranslatedSubtitles(item: Record<string, unknown>): unknown {
  const raw = item.translated_video_subtitles;
  if (Array.isArray(raw) && raw.length > 0) {
    const filtered = raw
      .slice(0, 2)
      .map((x) => {
        if (!x || typeof x !== "object") return null;
        const o = x as Record<string, unknown>;
        const uri = str(o.uri) ?? str(o.url) ?? str(o.subtitle_uri);
        if (!uri) return null;
        return {
          uri,
          locale: str(o.locale) ?? str(o.language) ?? undefined,
        };
      })
      .filter((x) => x != null) as { uri: string; locale?: string }[];
    return filtered.length ? filtered : undefined;
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const uri = str(o.uri) ?? str(o.url);
    if (uri) return [{ uri, locale: str(o.locale) ?? undefined }];
  }
  return undefined;
}

/** Найти объект медиа в ответе TikHub (список или вложенный data). */
function findInstagramMediaItem(json: unknown): Record<string, unknown> | null {
  const fromList = pickItems(json);
  if (fromList[0] && typeof fromList[0] === "object") {
    const row = fromList[0] as Record<string, unknown>;
    if (row.video_versions || row.video_url || row.code) return row;
  }
  function walk(o: unknown, depth: number): Record<string, unknown> | null {
    if (depth > 14 || !o || typeof o !== "object") return null;
    if (Array.isArray(o)) {
      for (const el of o) {
        const r = walk(el, depth + 1);
        if (r) return r;
      }
      return null;
    }
    const r = o as Record<string, unknown>;
    const hasMedia =
      (Array.isArray(r.video_versions) && r.video_versions.length > 0) || typeof r.video_url === "string";
    const hasId = typeof r.code === "string" || typeof r.shortcode === "string" || typeof r.id === "string";
    if (hasMedia && hasId) return r;
    for (const v of Object.values(r)) {
      const x = walk(v, depth + 1);
      if (x) return x;
    }
    return null;
  }
  return walk(json, 0);
}

/**
 * Подтянуть один Instagram Reel по shortcode или permalink (TikHub v3 → v2).
 * Не логирует полные URL ответа.
 */
export async function fetchInstagramReelByCodeFromTikHub(
  shortcode: string | null | undefined,
  reelUrlFallback?: string | null,
): Promise<NormalizedInstagramReel | null> {
  const token = process.env.TIKHUB_TOKEN?.trim();
  if (!token) return null;
  const clean = shortcode?.trim() ?? "";

  const tryFetch = async (requestUrl: string): Promise<NormalizedInstagramReel | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS_INSTAGRAM_SINGLE_POST);
    try {
      const res = await fetch(requestUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) return null;
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        return null;
      }
      const item = findInstagramMediaItem(json);
      if (!item) return null;
      return parseItem(item);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  if (clean) {
    const v3Url = `${TIKHUB_POST_BY_CODE_V3}?code=${encodeURIComponent(clean)}`;
    const fromV3 = await tryFetch(v3Url);
    if (fromV3) return fromV3;
  }

  const permalink =
    reelUrlFallback?.trim() ||
    (clean ? `https://www.instagram.com/reel/${clean}/` : "");
  if (!permalink) return null;
  const v2Url = `${TIKHUB_POST_INFO_V2}?code_or_url=${encodeURIComponent(permalink)}`;
  return await tryFetch(v2Url);
}

function parseItem(item: Record<string, unknown>): NormalizedInstagramReel | null {
  const code = str(item.code);
  const idRaw = str(item.id);
  const externalId = (code || idRaw)?.trim();
  if (!externalId) return null;

  const caption = item.caption as Record<string, unknown> | undefined;
  const capUser = caption?.user as Record<string, unknown> | undefined;
  const user = item.user as Record<string, unknown> | undefined;

  const captionText = str(caption?.text);
  const username =
    str(user?.username) ?? str(capUser?.username) ?? null;
  const firstLine = captionText?.split(/\r?\n/).find((l) => l.trim().length > 0)?.trim();
  const title =
    firstLine && firstLine.length > 0
      ? firstLine.slice(0, 200)
      : username
        ? `Reel от @${username}`
        : "Instagram Reel";

  const thumb =
    str(item.thumbnail_url) ??
    (() => {
      const versions = item.image_versions as Record<string, unknown> | undefined;
      const list = versions?.items as unknown[] | undefined;
      const first = list?.[0] as Record<string, unknown> | undefined;
      return str(first?.url);
    })();

  const videoUrl = pickVideoUrlFromItem(item);

  const takenAt = num(item.taken_at, NaN);
  const takenDateStr = str(item.taken_at_date);
  let publishedAt: Date;
  if (takenDateStr) {
    const d = new Date(takenDateStr);
    publishedAt = Number.isNaN(d.getTime()) ? new Date() : d;
  } else if (Number.isFinite(takenAt)) {
    publishedAt = new Date(takenAt * 1000);
  } else {
    publishedAt = new Date();
  }

  const views =
    num(item.play_count, 0) ||
    num(item.ig_play_count, 0) ||
    num(item.fb_play_count, 0);
  const likes = num(item.like_count, 0) || num(item.fb_like_count, 0);
  const comments = num(item.comment_count, 0);
  const shares = num(item.share_count, 0);

  const durationRaw = num(item.video_duration, 0);
  const durationSeconds = Math.max(0, Math.round(durationRaw));

  const lang =
    str(item.original_lang_for_translations) ?? str(item.video_subtitles_locale) ?? null;

  const subtitlesUrl = str(item.video_subtitles_uri);

  const authorDisplay =
    str(user?.full_name) ?? str(capUser?.full_name) ?? null;
  const authorAvatar =
    str(user?.profile_pic_url_hd) ??
    str(user?.profile_pic_url) ??
    str(capUser?.profile_pic_url_hd) ??
    str(capUser?.profile_pic_url) ??
    null;

  const followers = (() => {
    const f = num(user?.follower_count, NaN);
    return Number.isFinite(f) && f > 0 ? Math.round(f) : null;
  })();

  const vv = item.video_versions as unknown[] | undefined;
  const videoVersionsCompact =
    Array.isArray(vv) && vv.length > 0
      ? vv
          .slice(0, 2)
          .map((x) => {
            if (!x || typeof x !== "object") return null;
            const u = str((x as Record<string, unknown>).url);
            return u ? { url: u } : null;
          })
          .filter((x): x is { url: string } => Boolean(x))
      : undefined;

  const translatedCompact = compactTranslatedSubtitles(item);

  const usefulRaw = JSON.stringify({
    code: externalId,
    video_url: str(item.video_url) || undefined,
    video_versions: videoVersionsCompact && videoVersionsCompact.length > 0 ? videoVersionsCompact : undefined,
    video_subtitles_uri: subtitlesUrl || undefined,
    translated_video_subtitles: translatedCompact,
    thumbnail_url: thumb || undefined,
    video_duration: durationSeconds,
    play_count: views,
    like_count: likes,
    comment_count: comments,
    share_count: shares,
    taken_at: Number.isFinite(takenAt) ? takenAt : undefined,
  });

  return {
    platform: "instagram",
    externalId,
    url: `https://www.instagram.com/reel/${code ?? externalId}/`,
    title,
    description: captionText ?? null,
    thumbnailUrl: thumb,
    videoUrl,
    views,
    likes,
    comments,
    shares,
    publishedAt,
    durationSeconds,
    language: lang,
    authorUsername: username,
    authorDisplayName: authorDisplay,
    authorAvatarUrl: authorAvatar,
    subtitlesUrl,
    followerCount: followers,
    usefulRaw,
  };
}

export type TikHubInstagramSearchResult = {
  reels: NormalizedInstagramReel[];
  cacheUrl: string | null;
};

export async function searchInstagramReelsTikHub(keyword: string): Promise<TikHubInstagramSearchResult> {
  const token = process.env.TIKHUB_TOKEN?.trim();
  if (!token) {
    await logTikHubIssue("missing_token", "TIKHUB_TOKEN не задан");
    return { reels: [], cacheUrl: null };
  }

  const q = keyword.trim();
  if (!q) return { reels: [], cacheUrl: null };

  const url = `${TIKHUB_SEARCH_URL}?keyword=${encodeURIComponent(q)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS_INSTAGRAM_SEARCH);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (res.status === 402) {
      await logTikHubIssue("insufficient_balance", "TikHub insufficient balance", { status: 402, keyword: q });
      return { reels: [], cacheUrl: null };
    }
    if (res.status === 401 || res.status === 403) {
      await logTikHubIssue("auth_error", "TikHub auth error", { status: res.status, keyword: q });
      return { reels: [], cacheUrl: null };
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      await logTikHubIssue("invalid_json", String(res.status), { status: res.status, keyword: q });
      return { reels: [], cacheUrl: null };
    }

    if (!res.ok) {
      const msg =
        typeof json === "object" && json && "message" in json
          ? String((json as { message?: unknown }).message).slice(0, 240)
          : res.statusText;
      await logTikHubIssue("http_error", `${res.status} ${msg}`, { status: res.status, keyword: q });
      return { reels: [], cacheUrl: null };
    }

    const rootCache =
      typeof json === "object" && json && "cache_url" in json
        ? str((json as { cache_url?: unknown }).cache_url)
        : null;

    const items = pickItems(json);
    const reels: NormalizedInstagramReel[] = [];
    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue;
      const parsed = parseItem(raw as Record<string, unknown>);
      if (parsed) reels.push(parsed);
    }

    await logAdminEvent({
      level: "info",
      type: "api_fetch",
      message: "TikHub Instagram: успех",
      meta: {
        provider: "tikhub_instagram",
        keyword: q,
        reelsCount: reels.length,
        hasCacheUrl: Boolean(rootCache),
      },
    });

    return { reels, cacheUrl: rootCache };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      await logTikHubIssue("timeout", "TikHub timeout", { keyword: q });
    } else {
      await logAdminEvent({
        level: "error",
        type: "api_fetch",
        message: "TikHub Instagram: fetch error",
        meta: compactErrorMeta(e, { provider: "tikhub_instagram", keyword: q }),
      });
    }
    return { reels: [], cacheUrl: null };
  } finally {
    clearTimeout(timer);
  }
}

export { parseItem as normalizeInstagramReelFromTikHubItem };
