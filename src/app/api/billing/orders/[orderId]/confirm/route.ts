import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { confirmBillingOrder } from "@/lib/billing/billing-service";

export const dynamic = "force-dynamic";

function assertAdmin(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? req.headers.get("x-admin-key");
  return key === secret;
}

export const POST = withApiRoute("billing.orders.confirm.POST", async (req, ctx) => {
  if (!assertAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const params = ctx?.params ? await ctx.params : {};
  const orderId = params.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await confirmBillingOrder(orderId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "confirm_failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, orderId });
});
