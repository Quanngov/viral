import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import type { SocialPlatform } from "@/lib/profile/profile-types";
import { ensureSessionUser } from "@/lib/session-user";
import { SocialSyncService } from "@/lib/social-sync/social-sync-service";
import { isSocialPlatform } from "@/lib/social-sync/provider-registry";
import { getSocialAccount } from "@/lib/social-sync/stores/social-account-store";

export const dynamic = "force-dynamic";

export const POST = withApiRoute("social.sync.manual.POST", async (req: Request) => {
  const { userId } = await ensureSessionUser();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const platform = typeof (body as { platform?: string })?.platform === "string"
    ? (body as { platform: string }).platform.trim()
    : "";

  if (!isSocialPlatform(platform)) {
    return NextResponse.json({ error: "invalid_platform" }, { status: 400 });
  }

  try {
    const result = await SocialSyncService.manualRefresh(userId, platform as SocialPlatform);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "sync_failed";
    const status = msg === "cooldown" ? 429 : msg === "not_connected" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
});

export const GET = withApiRoute("social.sync.status.GET", async (req: Request) => {
  const { userId } = await ensureSessionUser();
  const url = new URL(req.url);
  const platform = url.searchParams.get("platform")?.trim() ?? "";

  if (!isSocialPlatform(platform)) {
    return NextResponse.json({ error: "invalid_platform" }, { status: 400 });
  }

  const account = await getSocialAccount(userId, platform as SocialPlatform);
  if (!account) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: account.connectionStatus === "connected",
    syncStatus: account.syncStatus,
    connectionHealth: account.connectionHealth,
    connectionStatus: account.connectionStatus,
    authMethod: account.authMethod,
    lastSyncAt: account.lastSyncAt?.toISOString() ?? null,
    lastSyncSuccessAt: account.lastSyncSuccessAt?.toISOString() ?? null,
    nextSyncAt: account.nextSyncAt?.toISOString() ?? null,
    lastSyncError: account.lastSyncError || null,
    updateStrategy: account.updateStrategy,
    statsUpdatedAt: account.statsUpdatedAt?.toISOString() ?? null,
  });
});
