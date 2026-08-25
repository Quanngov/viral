import { NextResponse } from "next/server";
import type { SocialPlatform } from "@/lib/profile/profile-types";

/** Required OAuth credentials + Google/Meta/TikTok console setup per platform. */
const PLATFORM_REQUIREMENTS: Record<
  SocialPlatform,
  { credentials: string[]; redirectUriPath: string; scopes: string[]; console: string }
> = {
  youtube: {
    credentials: ["GOOGLE_CLIENT_ID (or YOUTUBE_CLIENT_ID)", "GOOGLE_CLIENT_SECRET (or YOUTUBE_CLIENT_SECRET)"],
    redirectUriPath: "/api/social/oauth/youtube/callback",
    scopes: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    console: "Google Cloud Console → APIs & Services (enable “YouTube Data API v3” + configure OAuth consent screen)",
  },
  instagram: {
    credentials: ["META_APP_ID (or FACEBOOK_APP_ID)", "META_APP_SECRET (or FACEBOOK_APP_SECRET)"],
    redirectUriPath: "/api/social/oauth/instagram/callback",
    scopes: ["instagram_basic", "pages_show_list", "pages_read_engagement"],
    console:
      "Meta for Developers → App → Instagram → API setup with Facebook login",
  },
  tiktok: {
    credentials: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
    redirectUriPath: "/api/social/oauth/tiktok/callback",
    scopes: ["user.info.basic", "video.list"],
    console: "TikTok for Developers → App → Login Kit",
  },
};

export type OAuthErrorReason =
  | "not_configured"
  | "invalid_platform"
  | "invalid_state"
  | "provider_error"
  | "connect_failed";

function reasonSummary(reason: OAuthErrorReason, platform: string): string {
  switch (reason) {
    case "not_configured":
      return `${platform} OAuth is not configured on the server.`;
    case "invalid_platform":
      return `“${platform}” is not a supported social platform.`;
    case "invalid_state":
      return "The OAuth state token was missing, invalid, or expired. Please start the connection again.";
    case "provider_error":
      return `The identity provider returned an error while authorizing ${platform}.`;
    case "connect_failed":
      return `Authorization code exchange or account lookup failed for ${platform}. See details below for the provider error.`;
    default:
      return "OAuth failed.";
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}

/**
 * Render a meaningful OAuth failure page (does NOT silently redirect to the profile).
 * Explains exactly what is wrong and — for configuration failures — what must be set up.
 */
export function oauthErrorResponse(args: {
  platform: string;
  reason: OAuthErrorReason;
  origin: string;
  status?: number;
  detail?: string;
}): NextResponse {
  const { platform, reason, origin } = args;
  const status = args.status ?? (reason === "not_configured" ? 500 : 400);
  const profileHref = `${origin}/?tab=profile`;
  const req = (PLATFORM_REQUIREMENTS as Record<string, (typeof PLATFORM_REQUIREMENTS)[SocialPlatform]>)[platform];

  const setupBlock =
    req && (reason === "not_configured" || reason === "connect_failed")
      ? `
        <h2>Required configuration</h2>
        <ul>
          <li><strong>Credentials (env):</strong> ${req.credentials.map((c) => `<code>${esc(c)}</code>`).join(", ")}</li>
          <li><strong>Authorized redirect URI:</strong> <code>${esc(origin + req.redirectUriPath)}</code></li>
          <li><strong>Scopes:</strong> ${req.scopes.map((s) => `<code>${esc(s)}</code>`).join(", ")}</li>
          <li><strong>Console:</strong> ${esc(req.console)}</li>
        </ul>`
      : "";

  const detailBlock = args.detail
    ? `<h2>Provider error</h2><pre class="detail">${esc(args.detail)}</pre>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OAuth error — ${esc(platform)}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background:#0b0b0f; color:#e7e7ee; margin:0; padding:40px; }
    .card { max-width:640px; margin:40px auto; background:#15151d; border:1px solid #2a2a37; border-radius:16px; padding:28px 32px; }
    h1 { font-size:20px; margin:0 0 8px; color:#ff6b6b; }
    h2 { font-size:14px; text-transform:uppercase; letter-spacing:.05em; color:#8a8a9a; margin:24px 0 8px; }
    p { line-height:1.5; margin:8px 0; }
    code { background:#22222e; padding:2px 6px; border-radius:6px; font-size:13px; color:#a5d6ff; }
    ul { padding-left:18px; }
    li { margin:6px 0; }
    .detail { color:#c2c2cf; font-size:13px; white-space:pre-wrap; word-break:break-word; background:#0f0f16; border:1px solid #2a2a37; border-radius:10px; padding:12px 14px; overflow-x:auto; }
    a.btn { display:inline-block; margin-top:24px; background:#3b5bff; color:#fff; text-decoration:none; padding:10px 18px; border-radius:10px; font-weight:600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Could not connect ${esc(platform)}</h1>
    <p>${esc(reasonSummary(reason, platform))}</p>
    ${detailBlock}
    ${setupBlock}
    <a class="btn" href="${esc(profileHref)}">Back to profile</a>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
