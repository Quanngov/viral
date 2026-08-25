import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { SocialSyncService } from "@/lib/social-sync/social-sync-service";
import { listSocialProviders } from "@/lib/social-sync/provider-registry";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function authorizeAdmin(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const url = new URL(req.url);
  return url.searchParams.get("key") === secret;
}

export const GET = withApiRoute("admin.social.GET", async (req: Request) => {
  if (!authorizeAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const overview = await SocialSyncService.getAdminOverview();
  const connections = await prisma.userSocialAccount.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      userId: true,
      platform: true,
      username: true,
      authMethod: true,
      connectionStatus: true,
      connectionHealth: true,
      syncStatus: true,
      updateStrategy: true,
      lastSyncSuccessAt: true,
      lastSyncFailedAt: true,
      nextSyncAt: true,
      lastSyncError: true,
    },
  });

  const failedLogs = await prisma.socialSyncLog.findMany({
    where: { level: "error" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    ...overview,
    connections,
    failedLogs,
    integrations: listSocialProviders().map((p) => ({
      platform: p.platform,
      capabilities: p.capabilities,
    })),
  });
});

export const POST = withApiRoute("admin.social.POST", async (req: Request) => {
  if (!authorizeAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { action?: string };
  if (body.action === "process_queue") {
    const result = await SocialSyncService.processQueue(50);
    return NextResponse.json({ ok: true, result });
  }
  if (body.action === "run_scheduled") {
    const result = await SocialSyncService.runScheduledSyncs();
    return NextResponse.json({ ok: true, result });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
});
