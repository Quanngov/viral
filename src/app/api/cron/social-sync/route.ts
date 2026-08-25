import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { SocialSyncService } from "@/lib/social-sync/social-sync-service";

export const dynamic = "force-dynamic";

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim() || process.env.ADMIN_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  return header === secret || key === secret;
}

export const POST = withApiRoute("cron.social-sync.POST", async (req: Request) => {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const scheduled = await SocialSyncService.runScheduledSyncs();
  const processed = await SocialSyncService.processQueue(25);

  return NextResponse.json({
    ok: true,
    scheduled,
    processed,
    at: new Date().toISOString(),
  });
});
