import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { buildProfileHubPayload, refreshUserSocialStats } from "@/lib/profile/profile-hub-service";
import { canAutoRefreshProfile } from "@/lib/profile/profile-plan-features";
import { getSubscriptionSnapshot } from "@/lib/billing/billing-service";
import type { BillingPlanId } from "@/lib/billing/billing.config";
import { ensureSessionUser } from "@/lib/session-user";

export const dynamic = "force-dynamic";

/** Enqueues background sync jobs — never blocks on external APIs. */
export const POST = withApiRoute("user.profile.refresh.POST", async () => {
  const { userId } = await ensureSessionUser();
  const sub = await getSubscriptionSnapshot(userId);
  const planId = (sub.plan as BillingPlanId) || "FREE";

  if (!canAutoRefreshProfile(planId)) {
    return NextResponse.json(
      {
        error: "upgrade_required",
        message: "Автообновление статистики доступно на тарифах Pro и выше.",
      },
      { status: 403 },
    );
  }

  const queuedAt = await refreshUserSocialStats(userId);
  const hub = await buildProfileHubPayload(userId, { justRefreshed: true });
  return NextResponse.json({
    hub,
    queuedAt: queuedAt.toISOString(),
    message: "Синхронизация поставлена в очередь. Данные обновятся из кэша после завершения.",
  });
});
