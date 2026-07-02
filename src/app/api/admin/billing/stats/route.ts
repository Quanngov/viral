import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { getAdminBillingStats } from "@/lib/billing/billing-service";

export const dynamic = "force-dynamic";

function assertAdmin(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? req.headers.get("x-admin-key");
  return key === secret;
}

export const GET = withApiRoute("admin.billing.stats.GET", async (req: Request) => {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const stats = await getAdminBillingStats();
  return NextResponse.json(stats);
});
