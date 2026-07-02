import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import type { BillingInterval } from "@/lib/billing/billing.config";
import { createBillingOrder } from "@/lib/billing/billing-service";
import { ensureSessionUser } from "@/lib/token-wallet";

export const dynamic = "force-dynamic";

type Body = {
  kind?: "SUBSCRIPTION" | "TOKEN_PACK";
  productId?: string;
  billingInterval?: BillingInterval;
};

export const POST = withApiRoute("billing.orders.POST", async (req: Request) => {
  const { userId } = await ensureSessionUser();
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  if (!body.kind || !body.productId) {
    return NextResponse.json({ error: "bad_request", message: "kind и productId обязательны" }, { status: 400 });
  }

  try {
    const order = await createBillingOrder({
      userId,
      kind: body.kind,
      productId: body.productId,
      billingInterval: body.billingInterval,
    });
    return NextResponse.json({
      ok: true,
      orderId: order.orderId,
      amountRub: order.amountRub,
      tokensGrant: order.tokensGrant,
      status: "PENDING",
      message: "Заказ создан. Подтвердите оплату через платёжную систему или админ-панель.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid_order";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});
