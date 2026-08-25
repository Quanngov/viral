import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { buildDashboardHomePayload } from "@/lib/dashboard-home-service";
import { ensureSessionUser } from "@/lib/session-user";

export const dynamic = "force-dynamic";

export const GET = withApiRoute("user.dashboard.home.GET", async () => {
  const { userId } = await ensureSessionUser();
  const home = await buildDashboardHomePayload(userId);
  return NextResponse.json({ home });
});
