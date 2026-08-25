import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { listSocialProviders } from "@/lib/social-sync/provider-registry";

export const dynamic = "force-dynamic";

export const GET = withApiRoute("social.integration-config.GET", async () => {
  return NextResponse.json({
    integrations: listSocialProviders().map((p) => ({
      platform: p.platform,
      oauthAvailable: p.capabilities.oauth,
      webhooks: p.capabilities.webhooks,
      connectPath: `/api/social/oauth/${p.platform}/start`,
      limitations: p.capabilities.limitations,
    })),
  });
});
