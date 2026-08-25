import "server-only";

import { createHmac } from "node:crypto";
import type {
  AnalyticsRefreshResult,
  ConnectionValidation,
  OAuthConnectInput,
  OAuthConnectResult,
  ProfileRefreshResult,
  ProviderContext,
  RefreshResult,
  VideoRefreshResult,
  WebhookHandleResult,
  WebhookRegistration,
  WebhookVerifyResult,
} from "../social-sync.types";
import type { SocialProvider } from "../social-provider.interface";
import { avgFrom, estimateMonthlyViews, fetchJson } from "../provider-utils";

const TIKTOK_AUTH = "https://www.tiktok.com/v2/auth/authorize";
const TIKTOK_TOKEN = "https://open.tiktokapis.com/v2/oauth/token";
const TIKTOK_API = "https://open.tiktokapis.com/v2";

function env(...keys: string[]): string | null {
  for (const k of keys) {
    const v = process.env[k]?.trim();
    if (v) return v;
  }
  return null;
}

function oauthConfigured(): boolean {
  return Boolean(env("TIKTOK_CLIENT_KEY") && env("TIKTOK_CLIENT_SECRET"));
}

function emptyProfile(username: string): ProfileRefreshResult {
  const handle = username.replace(/^@/, "");
  return {
    username: handle,
    displayName: handle,
    avatarUrl: "",
    profileUrl: handle ? `https://tiktok.com/@${handle}` : "",
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

export const tiktokProvider: SocialProvider = {
  platform: "tiktok",
  capabilities: {
    oauth: oauthConfigured(),
    webhooks: true,
    profileMetrics: true,
    videoMetrics: true,
    analyticsInsights: false,
    limitations: [
      "Follower counts and video list require approved TikTok API products.",
      "Aggregate monthly views and deep analytics require Research API (separate approval).",
      "Webhooks available for authorized event subscriptions per TikTok developer docs.",
    ],
  },

  buildAuthorizationUrl(state, redirectUri) {
    if (!oauthConfigured()) return null;
    const params = new URLSearchParams({
      client_key: env("TIKTOK_CLIENT_KEY")!,
      redirect_uri: redirectUri,
      state,
      scope: "user.info.basic,video.list",
      response_type: "code",
    });
    return `${TIKTOK_AUTH}?${params}`;
  },

  async connect(input: OAuthConnectInput): Promise<OAuthConnectResult | null> {
    const body = new URLSearchParams({
      client_key: env("TIKTOK_CLIENT_KEY")!,
      client_secret: env("TIKTOK_CLIENT_SECRET")!,
      code: input.code,
      grant_type: "authorization_code",
      redirect_uri: input.redirectUri,
    });
    const tokenRes = await fetch(TIKTOK_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!tokenRes.ok) return null;
    const tokens = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      open_id?: string;
      scope?: string;
    };
    if (!tokens.access_token) return null;

    const userRes = await fetch(`${TIKTOK_API}/user/info/?fields=open_id,union_id,avatar_url,display_name,username`, {
      method: "GET",
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userJson = (await userRes.json()) as {
      data?: { user?: { open_id?: string; username?: string; display_name?: string; avatar_url?: string } };
    };
    const user = userJson.data?.user;
    const username = user?.username || "";
    return {
      externalAccountId: user?.open_id || tokens.open_id || "",
      username,
      displayName: user?.display_name || username,
      avatarUrl: user?.avatar_url || "",
      profileUrl: username ? `https://tiktok.com/@${username}` : "",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
      scopes: (tokens.scope ?? "").split(",").filter(Boolean),
    };
  },

  async disconnect(_ctx) {},

  async refreshProfile(ctx) {
    if (!ctx.accessToken) return emptyProfile(ctx.username);
    const res = await fetch(`${TIKTOK_API}/user/info/?fields=open_id,avatar_url,display_name,username,follower_count,likes_count,video_count`, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
    });
    if (!res.ok) return emptyProfile(ctx.username);
    const json = (await res.json()) as {
      data?: {
        user?: {
          username?: string;
          display_name?: string;
          avatar_url?: string;
          follower_count?: number;
          likes_count?: number;
          video_count?: number;
        };
      };
    };
    const u = json.data?.user;
    const username = u?.username || ctx.username;
    return {
      username,
      displayName: u?.display_name || username,
      avatarUrl: u?.avatar_url || "",
      profileUrl: username ? `https://tiktok.com/@${username}` : "",
      followers: u?.follower_count ?? null,
      totalLikes: u?.likes_count ?? null,
      videoCount: u?.video_count ?? null,
    };
  },

  async refreshVideos(ctx) {
    if (!ctx.accessToken) return emptyVideos();
    const res = await fetch(`${TIKTOK_API}/video/list/?fields=id,title,cover_image_url,create_time,view_count,like_count,comment_count,share_url`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ctx.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ max_count: 12 }),
    });
    if (!res.ok) return emptyVideos();
    const json = (await res.json()) as {
      data?: {
        videos?: {
          id?: string;
          title?: string;
          cover_image_url?: string;
          create_time?: number;
          view_count?: number;
          like_count?: number;
          comment_count?: number;
          share_url?: string;
        }[];
      };
    };
    const videos = json.data?.videos ?? [];
    const viewCounts = videos.map((v) => v.view_count ?? 0).filter((n) => n > 0);
    const comments = videos.reduce((s, v) => s + (v.comment_count ?? 0), 0);
    const best = [...videos].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))[0];
    const last = videos.map((v) => v.create_time).filter(Boolean).sort().reverse()[0];
    return {
      videoCount: videos.length || null,
      avgViews: avgFrom(viewCounts),
      totalComments: comments || null,
      lastUploadAt: last ? new Date(last * 1000) : null,
      bestVideo: best
        ? {
            title: best.title || "TikTok video",
            thumbnailUrl: best.cover_image_url || "",
            url: best.share_url || "",
            views: best.view_count ?? null,
          }
        : null,
    };
  },

  async refreshAnalytics(ctx) {
    const videos = await this.refreshVideos(ctx);
    return {
      avgEngagement: null,
      monthlyViews: estimateMonthlyViews(videos.avgViews),
      growthPercent: null,
      postingFreq: videos.lastUploadAt ? "recent" : null,
      engagementRate: null,
    };
  },

  async refresh(ctx): Promise<RefreshResult> {
    const profile = await this.refreshProfile(ctx);
    const videos = await this.refreshVideos(ctx);
    const analytics = await this.refreshAnalytics(ctx);
    const hasData = profile.followers != null || videos.avgViews != null;
    return { profile, videos, analytics, statsSource: hasData ? "api" : "pending" };
  },

  async validateConnection(ctx): Promise<ConnectionValidation> {
    if (!ctx.accessToken) {
      return { valid: false, health: "error", errorMessage: "No access token" };
    }
    const res = await fetch(`${TIKTOK_API}/user/info/?fields=open_id`, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
    });
    return res.ok
      ? { valid: true, health: "healthy", tokenExpiresAt: ctx.tokenExpiresAt ?? null }
      : { valid: false, health: "error", errorMessage: "TikTok token invalid" };
  },

  verifyWebhook(headers, rawBody): WebhookVerifyResult {
    const signature = headers["tiktok-signature"] || headers["x-tiktok-signature"];
    const secret = env("TIKTOK_CLIENT_SECRET");
    if (!signature || !secret) return { valid: !signature };
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    return { valid: signature.includes(expected) };
  },

  async handleWebhookEvent(payload): Promise<WebhookHandleResult | null> {
    const body = payload as { event?: string; user_openid?: string; create_time?: number };
    if (!body.user_openid) return null;
    return {
      eventType: body.event || "tiktok.event",
      externalEventId: `tt-${body.create_time ?? Date.now()}`,
      enqueueSync: true,
      accountExternalId: body.user_openid,
    };
  },

  async registerWebhook(_ctx, callbackUrl): Promise<WebhookRegistration | null> {
    return {
      externalSubId: env("TIKTOK_CLIENT_KEY") || "tiktok-app",
      callbackUrl,
      topics: ["video.publish", "authorization.removed"],
    };
  },
};
