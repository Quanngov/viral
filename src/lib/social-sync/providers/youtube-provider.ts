import "server-only";

import type { SocialPlatform } from "@/lib/profile/profile-types";
import type {
  AnalyticsRefreshResult,
  ConnectionValidation,
  OAuthConnectInput,
  OAuthConnectResult,
  ProfileRefreshResult,
  ProviderCapability,
  ProviderContext,
  RefreshResult,
  VideoRefreshResult,
} from "../social-sync.types";
import type { SocialProvider } from "../social-provider.interface";
import { avgFrom, estimateMonthlyViews, fetchJson } from "../provider-utils";

const YT_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const YT_TOKEN = "https://oauth2.googleapis.com/token";
const YT_API = "https://www.googleapis.com/youtube/v3";

function env(...keys: string[]): string | null {
  for (const k of keys) {
    const v = process.env[k]?.trim();
    if (v) return v;
  }
  return null;
}

function oauthConfigured(): boolean {
  return Boolean(env("GOOGLE_CLIENT_ID", "YOUTUBE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET", "YOUTUBE_CLIENT_SECRET"));
}

type YtChannelResponse = {
  items?: {
    id?: string;
    snippet?: {
      title?: string;
      customUrl?: string;
      thumbnails?: { default?: { url?: string } };
    };
    statistics?: {
      subscriberCount?: string;
      viewCount?: string;
      videoCount?: string;
    };
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }[];
};

type YtPlaylistResponse = {
  items?: { contentDetails?: { videoId?: string }; snippet?: { publishedAt?: string } }[];
};

type YtVideosResponse = {
  items?: {
    id?: string;
    snippet?: { title?: string; publishedAt?: string; thumbnails?: { medium?: { url?: string } } };
    statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  }[];
};

async function exchangeGoogleCode(code: string, redirectUri: string) {
  const clientId = env("GOOGLE_CLIENT_ID", "YOUTUBE_CLIENT_ID")!;
  const clientSecret = env("GOOGLE_CLIENT_SECRET", "YOUTUBE_CLIENT_SECRET")!;
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(YT_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) return null;
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
}

async function refreshGoogleToken(refreshToken: string) {
  const clientId = env("GOOGLE_CLIENT_ID", "YOUTUBE_CLIENT_ID")!;
  const clientSecret = env("GOOGLE_CLIENT_SECRET", "YOUTUBE_CLIENT_SECRET")!;
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch(YT_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) return null;
  return (await res.json()) as { access_token: string; expires_in?: number };
}

async function fetchChannel(accessToken: string): Promise<YtChannelResponse | null> {
  const url = `${YT_API}/channels?part=snippet,statistics,contentDetails&mine=true`;
  const res = await fetchJson<YtChannelResponse>(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.ok ? res.data : null;
}

async function fetchRecentVideos(accessToken: string, uploadsPlaylistId: string): Promise<YtVideosResponse["items"]> {
  const listUrl = `${YT_API}/playlistItems?part=contentDetails,snippet&playlistId=${uploadsPlaylistId}&maxResults=12`;
  const list = await fetchJson<YtPlaylistResponse>(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!list.ok || !list.data.items?.length) return [];
  const ids = list.data.items.map((i) => i.contentDetails?.videoId).filter(Boolean).join(",");
  if (!ids) return [];
  const videosUrl = `${YT_API}/videos?part=snippet,statistics&id=${ids}`;
  const videos = await fetchJson<YtVideosResponse>(videosUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return videos.ok ? (videos.data.items ?? []) : [];
}

function emptyProfile(username: string): ProfileRefreshResult {
  const handle = username.replace(/^@/, "");
  return {
    username: handle,
    displayName: handle,
    avatarUrl: "",
    profileUrl: handle ? `https://youtube.com/@${handle}` : "",
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

export const youtubeProvider: SocialProvider = {
  platform: "youtube",
  capabilities: {
    oauth: oauthConfigured(),
    webhooks: true,
    profileMetrics: true,
    videoMetrics: true,
    analyticsInsights: true,
    limitations: [
      "Monthly views are estimated from recent upload averages (YouTube has no single monthly-views field).",
      "PubSubHubbub webhooks notify of feed changes; metrics still require a follow-up sync job.",
    ],
  },

  buildAuthorizationUrl(state, redirectUri) {
    if (!oauthConfigured()) return null;
    const clientId = env("GOOGLE_CLIENT_ID", "YOUTUBE_CLIENT_ID")!;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/userinfo.profile",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `${YT_AUTH}?${params}`;
  },

  async connect(input: OAuthConnectInput): Promise<OAuthConnectResult | null> {
    const tokens = await exchangeGoogleCode(input.code, input.redirectUri);
    if (!tokens?.access_token) return null;
    const channel = await fetchChannel(tokens.access_token);
    const item = channel?.items?.[0];
    if (!item?.id) return null;
    const handle = item.snippet?.customUrl?.replace(/^@/, "") || item.snippet?.title || "";
    return {
      externalAccountId: item.id,
      username: handle,
      displayName: item.snippet?.title || handle,
      avatarUrl: item.snippet?.thumbnails?.default?.url || "",
      profileUrl: handle ? `https://youtube.com/@${handle}` : `https://youtube.com/channel/${item.id}`,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
      scopes: (tokens.scope ?? "").split(" ").filter(Boolean),
    };
  },

  async disconnect(_ctx) {
    /* Token revocation optional — credentials deleted at store layer */
  },

  async refreshProfile(ctx) {
    if (!ctx.accessToken) return emptyProfile(ctx.username);
    const channel = await fetchChannel(ctx.accessToken);
    const item = channel?.items?.[0];
    if (!item) return emptyProfile(ctx.username);
    const handle = item.snippet?.customUrl?.replace(/^@/, "") || ctx.username;
    return {
      username: handle,
      displayName: item.snippet?.title || handle,
      avatarUrl: item.snippet?.thumbnails?.default?.url || "",
      profileUrl: handle ? `https://youtube.com/@${handle}` : `https://youtube.com/channel/${item.id}`,
      followers: item.statistics?.subscriberCount ? Number(item.statistics.subscriberCount) : null,
      totalLikes: null,
      videoCount: item.statistics?.videoCount ? Number(item.statistics.videoCount) : null,
    };
  },

  async refreshVideos(ctx) {
    if (!ctx.accessToken) return emptyVideos();
    const channel = await fetchChannel(ctx.accessToken);
    const uploads = channel?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) return emptyVideos();
    const items = (await fetchRecentVideos(ctx.accessToken, uploads)) ?? [];
    const views = items.map((v) => Number(v.statistics?.viewCount ?? 0)).filter((n) => n > 0);
    const comments = items.reduce((s, v) => s + Number(v.statistics?.commentCount ?? 0), 0);
    const best = items.sort((a, b) => Number(b.statistics?.viewCount ?? 0) - Number(a.statistics?.viewCount ?? 0))[0];
    const lastUpload = items
      .map((v) => v.snippet?.publishedAt)
      .filter(Boolean)
      .sort()
      .reverse()[0];
    return {
      videoCount: channel?.items?.[0]?.statistics?.videoCount
        ? Number(channel.items[0].statistics.videoCount)
        : items.length,
      avgViews: avgFrom(views),
      totalComments: comments || null,
      lastUploadAt: lastUpload ? new Date(lastUpload) : null,
      bestVideo: best
        ? {
            title: best.snippet?.title || "",
            thumbnailUrl: best.snippet?.thumbnails?.medium?.url || "",
            url: `https://youtube.com/watch?v=${best.id}`,
            views: Number(best.statistics?.viewCount ?? 0) || null,
          }
        : null,
    };
  },

  async refreshAnalytics(ctx) {
    const videos = await this.refreshVideos(ctx);
    const monthlyViews = estimateMonthlyViews(videos.avgViews);
    return {
      avgEngagement: null,
      monthlyViews,
      growthPercent: null,
      postingFreq: videos.lastUploadAt ? "recent" : null,
      engagementRate: null,
    };
  },

  async refresh(ctx) {
    const profile = await this.refreshProfile(ctx);
    const videos = await this.refreshVideos(ctx);
    const analytics = await this.refreshAnalytics(ctx);
    const hasData = profile.followers != null || videos.avgViews != null;
    return {
      profile,
      videos,
      analytics,
      statsSource: hasData ? "api" : "pending",
    };
  },

  async validateConnection(ctx) {
    if (!ctx.accessToken) {
      return { valid: false, health: "error", errorCode: "not_configured", errorMessage: "No access token" };
    }
    const channel = await fetchChannel(ctx.accessToken);
    if (channel?.items?.length) {
      return { valid: true, health: "healthy", tokenExpiresAt: ctx.tokenExpiresAt ?? null };
    }
    return { valid: false, health: "error", errorCode: "invalid_connection", errorMessage: "Channel not accessible" };
  },

  async refreshAccessToken(ctx) {
    if (!ctx.refreshToken) return null;
    const tokens = await refreshGoogleToken(ctx.refreshToken);
    if (!tokens?.access_token) return null;
    return {
      accessToken: tokens.access_token,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
    };
  },

  verifyWebhook(headers, _rawBody) {
    const mode = headers["x-hub-mode"] || headers["hub.mode"];
    const challenge = headers["x-hub-challenge"] || headers["hub.challenge"];
    if (mode === "subscribe" && challenge) {
      return { valid: true, challenge };
    }
    return { valid: true };
  },

  async handleWebhookEvent(payload) {
    const body = payload as { feed?: { entry?: { "yt:channelId"?: string }[] } };
    const channelId = body?.feed?.entry?.[0]?.["yt:channelId"];
    return {
      eventType: "youtube.feed_update",
      externalEventId: `yt-${Date.now()}`,
      enqueueSync: true,
      accountExternalId: channelId,
    };
  },

  async registerWebhook(ctx, callbackUrl) {
    if (!ctx.externalAccountId) return null;
    const topic = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${ctx.externalAccountId}`;
    const body = new URLSearchParams({
      "hub.callback": callbackUrl,
      "hub.topic": topic,
      "hub.verify": "async",
      "hub.mode": "subscribe",
    });
    await fetch("https://pubsubhubbub.appspot.com/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    return {
      externalSubId: topic,
      callbackUrl,
      topics: ["feed_update"],
    };
  },
};
