import { compactErrorMeta, logAdminEvent } from "@/lib/admin-events";

const TIKHUB_SEARCH_URL = "https://api.tikhub.io/api/v1/instagram/v2/search_reels";
const TIMEOUT_MS = 14_000;

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
    }
    const itemsTop = d1.items;
    if (Array.isArray(itemsTop)) return itemsTop;
  }
  return [];
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

  const videoUrl =
    str(item.video_url) ??
    (() => {
      const versions = item.video_versions as unknown[] | undefined;
      const first = versions?.[0] as Record<string, unknown> | undefined;
      return str(first?.url);
    })();

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
    str(user?.profile_pic_url) ?? str(capUser?.profile_pic_url) ?? null;

  const followers = (() => {
    const f = num(user?.follower_count, NaN);
    return Number.isFinite(f) && f > 0 ? Math.round(f) : null;
  })();

  const usefulRaw = JSON.stringify({
    code: externalId,
    pk: idRaw,
    hasVideo: Boolean(videoUrl),
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
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

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
