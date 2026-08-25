import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { ensureSessionUser } from "@/lib/session-user";
import { createOAuthState } from "@/lib/social-sync/oauth-state";
import { SocialSyncService } from "@/lib/social-sync/social-sync-service";
import { isSocialPlatform } from "@/lib/social-sync/provider-registry";
import { oauthErrorResponse } from "../oauth-error-response";

export const dynamic = "force-dynamic";

export const GET = withApiRoute("social.oauth.start.GET", async (req: Request, ctx) => {
  const { userId } = await ensureSessionUser();
  const params = await ctx?.params;
  const platform = params?.platform?.trim() ?? "";
  const origin = new URL(req.url).origin;

  if (!isSocialPlatform(platform)) {
    return oauthErrorResponse({ platform, reason: "invalid_platform", origin });
  }

  const state = createOAuthState(userId, platform);
  const url = SocialSyncService.buildOAuthUrl(platform, state);

  // buildOAuthUrl returns null only when the provider's OAuth credentials are absent.
  // Surface the exact missing configuration instead of silently returning to the profile.
  if (!url) {
    return oauthErrorResponse({ platform, reason: "not_configured", origin });
  }

  return NextResponse.redirect(url);
});
