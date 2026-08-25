import "server-only";

import type {
  AnalyticsRefreshResult,
  ConnectionValidation,
  OAuthConnectInput,
  OAuthConnectResult,
  ProfileRefreshResult,
  ProviderContext,
  RefreshResult,
  VideoRefreshResult,
} from "../social-sync.types";
import type { SocialProvider } from "../social-provider.interface";
import { avgFrom, fetchJson } from "../provider-utils";

/**
 * Instagram API with Facebook Login (`facebook.com` OAuth → `graph.facebook.com`).
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/get-started/
 */
const GRAPH_VERSION = "v25.0";
const META_AUTH = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const META_TOKEN = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`;
const META_GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

const INSTAGRAM_SCOPES = [
  "instagram_basic",
  "pages_show_list",
  "pages_read_engagement",
] as const;

function env(...keys: string[]): string | null {
  for (const k of keys) {
    const v = process.env[k]?.trim();
    if (v) return v;
  }
  return null;
}

function metaAppId(): string | null {
  return env("META_APP_ID", "FACEBOOK_APP_ID");
}

function metaAppSecret(): string | null {
  return env("META_APP_SECRET", "FACEBOOK_APP_SECRET");
}

function oauthConfigured(): boolean {
  return Boolean(metaAppId() && metaAppSecret());
}

/** Redact secrets from URLs / bodies before logging. */
function redactSecrets(value: string): string {
  return value
    .replace(/([?&](?:access_token|client_secret|fb_exchange_token|code)=)[^&]*/gi, "$1[REDACTED]")
    .replace(/"(access_token|client_secret)"\s*:\s*"[^"]*"/gi, '"$1":"[REDACTED]"');
}

function redactJson(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redactJson);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (/token|secret|code/i.test(k) && typeof v === "string") {
      out[k] = "[REDACTED]";
    } else {
      out[k] = redactJson(v);
    }
  }
  return out;
}

type MetaErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
    error_user_title?: string;
    error_user_msg?: string;
  };
  error_message?: string;
  error_type?: string;
  code?: number;
};

export class MetaGraphError extends Error {
  readonly endpoint: string;
  readonly status: number;
  readonly body: unknown;
  readonly errorCode: number | null;
  readonly errorSubcode: number | null;
  readonly fbtraceId: string | null;
  readonly graphMessage: string;

  constructor(args: {
    step: string;
    endpoint: string;
    status: number;
    body: unknown;
    fallbackMessage?: string;
  }) {
    const parsed = args.body as MetaErrorBody;
    const err = parsed?.error;
    const graphMessage =
      err?.message ||
      parsed?.error_message ||
      args.fallbackMessage ||
      `Meta Graph API request failed (HTTP ${args.status})`;
    const errorCode = err?.code ?? parsed?.code ?? null;
    const errorSubcode = err?.error_subcode ?? null;
    const fbtraceId = err?.fbtrace_id ?? null;

    const parts = [
      `[instagram.oauth] ${args.step} failed`,
      `endpoint=${args.endpoint}`,
      `status=${args.status}`,
      errorCode != null ? `error.code=${errorCode}` : null,
      errorSubcode != null ? `error_subcode=${errorSubcode}` : null,
      `message=${graphMessage}`,
      fbtraceId ? `fbtrace_id=${fbtraceId}` : null,
      `body=${JSON.stringify(args.body)}`,
    ].filter(Boolean);

    super(parts.join(" | "));
    this.name = "MetaGraphError";
    this.endpoint = args.endpoint;
    this.status = args.status;
    this.body = args.body;
    this.errorCode = errorCode;
    this.errorSubcode = errorSubcode;
    this.fbtraceId = fbtraceId;
    this.graphMessage = graphMessage;
  }
}

async function metaGraphFetch<T>(
  step: string,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const safeUrl = redactSecrets(url);
  console.info(`[instagram.oauth] → ${step}`, { method, endpoint: safeUrl });

  let status = 0;
  let rawText = "";
  try {
    const res = await fetch(url, { ...init, cache: "no-store" });
    status = res.status;
    rawText = await res.text();
  } catch (networkError) {
    const message = networkError instanceof Error ? networkError.message : String(networkError);
    console.error(`[instagram.oauth] ✗ ${step} network error`, {
      endpoint: safeUrl,
      message,
    });
    throw new MetaGraphError({
      step,
      endpoint: safeUrl,
      status: 0,
      body: { error: { message: `Network error: ${message}`, code: 0 } },
      fallbackMessage: message,
    });
  }

  let parsed: unknown = rawText;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = { raw: rawText };
  }

  if (status < 200 || status >= 300) {
    console.error(`[instagram.oauth] ✗ ${step} failed`, {
      endpoint: safeUrl,
      status,
      body: redactJson(parsed),
      error: (parsed as MetaErrorBody)?.error ?? null,
      error_code: (parsed as MetaErrorBody)?.error?.code ?? null,
      error_subcode: (parsed as MetaErrorBody)?.error?.error_subcode ?? null,
      message: (parsed as MetaErrorBody)?.error?.message ?? null,
      fbtrace_id: (parsed as MetaErrorBody)?.error?.fbtrace_id ?? null,
    });
    throw new MetaGraphError({
      step,
      endpoint: safeUrl,
      status,
      body: parsed,
    });
  }

  console.info(`[instagram.oauth] ← ${step} ok`, {
    endpoint: safeUrl,
    status,
    body: redactJson(parsed),
  });
  return parsed as T;
}

function emptyProfile(username: string): ProfileRefreshResult {
  const handle = username.replace(/^@/, "");
  return {
    username: handle,
    displayName: handle,
    avatarUrl: "",
    profileUrl: handle ? `https://instagram.com/${handle}` : "",
    followers: null,
    totalLikes: null,
    videoCount: null,
  };
}

function emptyVideos(): VideoRefreshResult {
  return { videoCount: null, avgViews: null, totalComments: null, lastUploadAt: null, bestVideo: null };
}

function emptyAnalytics(): AnalyticsRefreshResult {
  return { avgEngagement: null, monthlyViews: null, growthPercent: null, postingFreq: null, engagementRate: null };
}

type MetaPage = {
  id: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: { id: string };
};

async function exchangeCodeForShortLivedToken(code: string, redirectUri: string) {
  const appId = metaAppId()!;
  const secret = metaAppSecret()!;
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: secret,
    redirect_uri: redirectUri,
    code,
  });
  const data = await metaGraphFetch<{ access_token?: string; expires_in?: number }>(
    "1.exchange_code_for_access_token",
    `${META_TOKEN}?${params}`,
  );
  if (!data.access_token) {
    throw new MetaGraphError({
      step: "1.exchange_code_for_access_token",
      endpoint: redactSecrets(`${META_TOKEN}?${params}`),
      status: 200,
      body: data,
      fallbackMessage: "Token response missing access_token",
    });
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

async function exchangeForLongLivedUserToken(shortLivedToken: string) {
  const appId = metaAppId()!;
  const secret = metaAppSecret()!;
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: secret,
    fb_exchange_token: shortLivedToken,
  });
  const data = await metaGraphFetch<{ access_token?: string; expires_in?: number }>(
    "2.exchange_short_lived_for_long_lived_token",
    `${META_TOKEN}?${params}`,
  );
  if (!data.access_token) {
    throw new MetaGraphError({
      step: "2.exchange_short_lived_for_long_lived_token",
      endpoint: redactSecrets(`${META_TOKEN}?${params}`),
      status: 200,
      body: data,
      fallbackMessage: "Long-lived token response missing access_token",
    });
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

/**
 * TEMPORARY diagnostics only — never throws, never alters connect flow.
 * Remove once empty /me/accounts is understood.
 */
async function logTemporaryOAuthDiagnostics(userAccessToken: string): Promise<void> {
  const logPrefix = "[instagram.oauth.diag]";

  async function diagGet(label: string, url: string): Promise<unknown> {
    const safeUrl = redactSecrets(url);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      let body: unknown = text;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = { raw: text };
      }
      console.info(`${logPrefix} ${label}`, {
        endpoint: safeUrl,
        status: res.status,
        body: redactJson(body),
      });
      return body;
    } catch (error) {
      console.error(`${logPrefix} ${label} network error`, {
        endpoint: safeUrl,
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  // GET /me?fields=id,name
  await diagGet(
    "GET /me?fields=id,name",
    `${META_GRAPH}/me?fields=id,name&access_token=${userAccessToken}`,
  );

  // GET /me/accounts?fields=id,name,tasks,instagram_business_account
  await diagGet(
    "GET /me/accounts?fields=id,name,tasks,instagram_business_account",
    `${META_GRAPH}/me/accounts?fields=id,name,tasks,instagram_business_account&access_token=${userAccessToken}`,
  );

  // debug_token — log metadata only; never log the access token
  const appId = metaAppId();
  const appSecret = metaAppSecret();
  if (appId && appSecret) {
    const debugUrl =
      `${META_GRAPH}/debug_token?input_token=${encodeURIComponent(userAccessToken)}` +
      `&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`;
    const debugBody = (await diagGet("GET /debug_token", debugUrl)) as {
      data?: {
        app_id?: string;
        type?: string;
        scopes?: string[];
        is_valid?: boolean;
        expires_at?: number;
      };
    } | null;
    const data = debugBody?.data;
    console.info(`${logPrefix} debug_token summary`, {
      app_id: data?.app_id ?? null,
      type: data?.type ?? null,
      scopes: data?.scopes ?? null,
      is_valid: data?.is_valid ?? null,
      expires_at: data?.expires_at ?? null,
    });
  } else {
    console.warn(`${logPrefix} skipped debug_token — app id/secret missing`);
  }
}

async function fetchPagesWithIg(userAccessToken: string): Promise<MetaPage[]> {
  const endpoint = `${META_GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`;
  const data = await metaGraphFetch<{ data?: MetaPage[] }>("3.GET_/me/accounts", endpoint);
  return data.data ?? [];
}

function findPageForIgAccount(pages: MetaPage[], igUserId?: string): MetaPage {
  console.info("[instagram.oauth] → 4.lookup_instagram_business_account", {
    pageCount: pages.length,
    pages: pages.map((p) => ({
      id: p.id,
      name: p.name,
      hasAccessToken: Boolean(p.access_token),
      instagram_business_account: p.instagram_business_account?.id ?? null,
    })),
  });

  let page: MetaPage | undefined;
  if (igUserId) {
    page = pages.find((p) => p.instagram_business_account?.id === igUserId && p.access_token);
  }
  if (!page) {
    page = pages.find((p) => p.instagram_business_account?.id && p.access_token);
  }

  if (!page?.instagram_business_account?.id || !page.access_token) {
    console.error("[instagram.oauth] ✗ 4.lookup_instagram_business_account failed", {
      pageCount: pages.length,
      reason: "No Facebook Page with a linked Instagram Business/Creator account was found",
    });
    throw new MetaGraphError({
      step: "4.lookup_instagram_business_account",
      endpoint: `${META_GRAPH}/me/accounts`,
      status: 200,
      body: {
        error: {
          message:
            "No Facebook Page with a linked Instagram Business/Creator account was found for this user. Link an Instagram professional account to a Page, then reconnect.",
          code: 0,
          error_subcode: 0,
          fbtrace_id: null,
        },
        pages: pages.map((p) => ({
          id: p.id,
          name: p.name,
          instagram_business_account: p.instagram_business_account?.id ?? null,
        })),
      },
    });
  }

  console.info("[instagram.oauth] ← 4.lookup_instagram_business_account ok", {
    pageId: page.id,
    pageName: page.name,
    igUserId: page.instagram_business_account.id,
  });
  return page;
}

async function fetchIgProfile(igUserId: string, accessToken: string) {
  return metaGraphFetch<{
    username?: string;
    name?: string;
    profile_picture_url?: string;
    followers_count?: number;
    media_count?: number;
  }>(
    "5.fetch_instagram_profile",
    `${META_GRAPH}/${igUserId}?fields=username,name,profile_picture_url,followers_count,media_count&access_token=${accessToken}`,
  );
}

function isAuthErrorStatus(status: number, body: string): boolean {
  if (status === 401 || status === 403) return true;
  const lower = body.toLowerCase();
  return (
    lower.includes('"code":190') ||
    lower.includes("session has expired") ||
    lower.includes("invalid oauth") ||
    lower.includes("cannot parse access token")
  );
}

export const instagramProvider: SocialProvider = {
  platform: "instagram",
  capabilities: {
    oauth: oauthConfigured(),
    webhooks: false,
    profileMetrics: true,
    videoMetrics: true,
    analyticsInsights: false,
    limitations: [
      "Requires Instagram Business/Creator account linked to a Facebook Page.",
      "Uses Instagram API with Facebook Login (graph.facebook.com).",
      "instagram_manage_insights is not requested — monthly views/insights are unavailable until that permission is enabled.",
    ],
  },

  buildAuthorizationUrl(state, redirectUri) {
    if (!oauthConfigured()) return null;
    const appId = metaAppId()!;
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      scope: INSTAGRAM_SCOPES.join(","),
      response_type: "code",
    });
    return `${META_AUTH}?${params}`;
  },

  async connect(input: OAuthConnectInput): Promise<OAuthConnectResult> {
    if (!oauthConfigured()) {
      throw new MetaGraphError({
        step: "0.oauth_not_configured",
        endpoint: "env",
        status: 0,
        body: {
          error: {
            message: "META_APP_ID / META_APP_SECRET (or FACEBOOK_*) are not configured",
            code: 0,
          },
        },
      });
    }

    console.info("[instagram.oauth] connect start", {
      redirectUri: input.redirectUri,
      scopes: INSTAGRAM_SCOPES,
      appId: metaAppId(),
    });

    // 1. Exchange authorization code for access token
    const shortLived = await exchangeCodeForShortLivedToken(input.code, input.redirectUri);

    // 2. Exchange short-lived token for long-lived token
    const longLived = await exchangeForLongLivedUserToken(shortLived.accessToken);
    const userAccessToken = longLived.accessToken;

    // TEMPORARY: diagnose empty /me/accounts — does not affect connect logic
    await logTemporaryOAuthDiagnostics(userAccessToken);

    // 3. GET /me/accounts
    const pages = await fetchPagesWithIg(userAccessToken);

    // 4. Lookup instagram_business_account
    const page = findPageForIgAccount(pages);
    const igUserId = page.instagram_business_account!.id;
    const pageAccessToken = page.access_token!;

    // 5. Fetch Instagram profile
    const profile = await fetchIgProfile(igUserId, pageAccessToken);
    const username = profile.username || "";
    if (!username) {
      throw new MetaGraphError({
        step: "5.fetch_instagram_profile",
        endpoint: `${META_GRAPH}/${igUserId}`,
        status: 200,
        body: {
          error: {
            message: "Instagram profile response missing username",
            code: 0,
          },
          profile,
        },
      });
    }

    const facebookUserRes = await metaGraphFetch<{ id?: string }>(
      "5b.GET_/me_facebook_user_id",
      `${META_GRAPH}/me?fields=id&access_token=${userAccessToken}`,
    ).catch(() => null);

    console.info("[instagram.oauth] connect success", {
      igUserId,
      username,
      pageId: page.id,
    });

    return {
      externalAccountId: igUserId,
      username,
      displayName: profile.name || username,
      avatarUrl: profile.profile_picture_url || "",
      profileUrl: `https://instagram.com/${username}`,
      accessToken: pageAccessToken,
      refreshToken: userAccessToken,
      expiresAt: undefined,
      scopes: [...INSTAGRAM_SCOPES],
      providerUserId: facebookUserRes?.id,
    };
  },

  async disconnect(ctx) {
    const token = ctx.refreshToken || ctx.accessToken;
    const facebookUserId = ctx.providerUserId;
    if (!token || !facebookUserId) return;
    await fetchJson(`${META_GRAPH}/${facebookUserId}/permissions?access_token=${encodeURIComponent(token)}`, {
      method: "DELETE",
    }).catch(() => null);
  },

  async refreshProfile(ctx) {
    if (!ctx.accessToken || !ctx.externalAccountId) return emptyProfile(ctx.username);
    try {
      const p = await fetchIgProfile(ctx.externalAccountId, ctx.accessToken);
      const username = p.username || ctx.username;
      return {
        username,
        displayName: p.name || username,
        avatarUrl: p.profile_picture_url || "",
        profileUrl: username ? `https://instagram.com/${username}` : "",
        followers: p.followers_count ?? null,
        totalLikes: null,
        videoCount: p.media_count ?? null,
      };
    } catch {
      return emptyProfile(ctx.username);
    }
  },

  async refreshVideos(ctx) {
    if (!ctx.accessToken || !ctx.externalAccountId) return emptyVideos();
    const res = await fetchJson<{
      data?: {
        id?: string;
        caption?: string;
        media_type?: string;
        timestamp?: string;
        permalink?: string;
        thumbnail_url?: string;
        like_count?: number;
        comments_count?: number;
      }[];
    }>(
      `${META_GRAPH}/${ctx.externalAccountId}/media?fields=id,caption,media_type,timestamp,permalink,thumbnail_url,like_count,comments_count&limit=12&access_token=${ctx.accessToken}`,
    );
    if (!res.ok) return emptyVideos();
    const items = res.data.data ?? [];
    const comments = items.reduce((s, i) => s + (i.comments_count ?? 0), 0);
    const best = [...items].sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))[0];
    const last = items
      .map((i) => i.timestamp)
      .filter(Boolean)
      .sort()
      .reverse()[0];
    return {
      videoCount: items.length || null,
      avgViews: null,
      totalComments: comments || null,
      lastUploadAt: last ? new Date(last) : null,
      bestVideo: best
        ? {
            title: best.caption?.slice(0, 80) || "Instagram post",
            thumbnailUrl: best.thumbnail_url || "",
            url: best.permalink || "",
            views: null,
          }
        : null,
    };
  },

  async refreshAnalytics(ctx) {
    if (!ctx.accessToken || !ctx.externalAccountId) return emptyAnalytics();
    const videos = await this.refreshVideos(ctx);
    const mediaRes = await fetchJson<{
      data?: { like_count?: number; comments_count?: number }[];
    }>(
      `${META_GRAPH}/${ctx.externalAccountId}/media?fields=like_count,comments_count&limit=12&access_token=${ctx.accessToken}`,
    );
    let avgEngagement: number | null = null;
    if (mediaRes.ok) {
      const eng = (mediaRes.data.data ?? []).map((i) => (i.like_count ?? 0) + (i.comments_count ?? 0));
      avgEngagement = avgFrom(eng);
    }
    return {
      avgEngagement,
      monthlyViews: null,
      growthPercent: null,
      postingFreq: videos.lastUploadAt ? "recent" : null,
      engagementRate: null,
    };
  },

  async refresh(ctx): Promise<RefreshResult> {
    const profile = await this.refreshProfile(ctx);
    const videos = await this.refreshVideos(ctx);
    const analytics = await this.refreshAnalytics(ctx);
    const hasData = profile.followers != null;
    return { profile, videos, analytics, statsSource: hasData ? "api" : "pending" };
  },

  async validateConnection(ctx): Promise<ConnectionValidation> {
    if (!ctx.accessToken || !ctx.externalAccountId) {
      return { valid: false, health: "error", errorCode: "not_configured", errorMessage: "Missing OAuth credentials" };
    }
    const res = await fetchJson<{ id?: string }>(
      `${META_GRAPH}/${ctx.externalAccountId}?fields=id&access_token=${ctx.accessToken}`,
    );
    if (res.ok) {
      return { valid: true, health: "healthy", tokenExpiresAt: ctx.tokenExpiresAt ?? null };
    }
    const authFail = isAuthErrorStatus(res.status, res.body);
    return {
      valid: false,
      health: authFail ? "revoked" : "error",
      errorCode: authFail ? "token_revoked" : "invalid_connection",
      errorMessage: authFail
        ? "Instagram access expired or was revoked — reconnect the account"
        : "Instagram account not accessible",
    };
  },

  async refreshAccessToken(ctx) {
    if (!ctx.refreshToken || !ctx.externalAccountId) return null;

    let userToken = ctx.refreshToken;
    try {
      const extended = await exchangeForLongLivedUserToken(userToken);
      userToken = extended.accessToken;
    } catch {
      // Keep existing user token and try to re-derive Page token.
    }

    try {
      const pages = await fetchPagesWithIg(userToken);
      const page = findPageForIgAccount(pages, ctx.externalAccountId);
      return {
        accessToken: page.access_token!,
        refreshToken: userToken,
        expiresAt: undefined,
      };
    } catch {
      return null;
    }
  },
};
