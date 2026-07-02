import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { activateTrial } from "@/lib/billing/billing-service";
import { ensureSessionUser } from "@/lib/token-wallet";

export const dynamic = "force-dynamic";

export const POST = withApiRoute("billing.trial.POST", async () => {
  const { userId } = await ensureSessionUser();
  const result = await activateTrial(userId);
  if (!result.ok) {
    const message =
      result.error === "auth_required"
        ? "Войдите в аккаунт, чтобы активировать пробный период"
        : "Пробный период уже был активирован";
    const status = result.error === "auth_required" ? 401 : 409;
    return NextResponse.json({ error: result.error, message }, { status });
  }
  return NextResponse.json({ ok: true });
});
