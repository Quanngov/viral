import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { parseOAuthState } from "@/lib/social-sync/oauth-state";
import { SocialSyncService } from "@/lib/social-sync/social-sync-service";
import { getSocialProvider, isSocialPlatform } from "@/lib/social-sync/provider-registry";
import { MetaGraphError } from "@/lib/social-sync/providers/instagram-provider";
import { oauthErrorResponse } from "../oauth-error-response";

export const dynamic = "force-dynamic";

export const GET = withApiRoute("social.oauth.callback.GET", async (req: Request, ctx) => {
  const params = await ctx?.params;
  const platform = params?.platform?.trim() ?? "";
  const url = new URL(req.url);
  const origin = url.origin;

  if (!isSocialPlatform(platform)) {
    return oauthErrorResponse({ platform, reason: "invalid_platform", origin });
  }

  // Provider (e.g. Google) returned an explicit error such as access_denied or redirect_uri_mismatch.
  const error = url.searchParams.get("error");
  if (error) {
    const description = url.searchParams.get("error_description") ?? undefined;
    return oauthErrorResponse({ platform, reason: "provider_error", origin, detail: description ?? error });
  }

  const code = url.searchParams.get("code")?.trim() ?? "";
  const state = url.searchParams.get("state")?.trim() ?? "";
  const parsed = parseOAuthState(state);

  if (!code || !parsed || parsed.platform !== platform) {
    return oauthErrorResponse({ platform, reason: "invalid_state", origin });
  }

  // If credentials are absent the token exchange cannot succeed — report it precisely.
  if (!getSocialProvider(platform).capabilities.oauth) {
    return oauthErrorResponse({ platform, reason: "not_configured", origin });
  }

  try {
    await SocialSyncService.connectOAuth({
      userId: parsed.userId,
      platform,
      code,
      redirectUri: `${origin}/api/social/oauth/${platform}/callback`,
    });
  } catch (e) {
    if (e instanceof MetaGraphError) {
      console.error(`[social.oauth.callback] ${platform} Meta Graph error`, {
        endpoint: e.endpoint,
        status: e.status,
        error_code: e.errorCode,
        error_subcode: e.errorSubcode,
        message: e.graphMessage,
        fbtrace_id: e.fbtraceId,
        body: e.body,
      });
    } else {
      console.error(`[social.oauth.callback] ${platform} connect failed`, e);
    }
    return oauthErrorResponse({
      platform,
      reason: "connect_failed",
      origin,
      detail: e instanceof Error ? e.message : undefined,
    });
  }

  const dashboardUrl = new URL("/?tab=profile", origin);
  dashboardUrl.searchParams.set("social_connected", platform);
  return NextResponse.redirect(dashboardUrl);
});
