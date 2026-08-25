import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { getProfilePlanFeatures } from "@/lib/profile/profile-plan-features";
import { AI_PROFILE_ANALYSIS_TOKEN_COST } from "@/lib/profile/profile-types";
import { getSubscriptionSnapshot, getWalletSnapshot } from "@/lib/billing/billing-service";
import type { BillingPlanId } from "@/lib/billing/billing.config";
import { prisma } from "@/lib/prisma";
import { ensureSessionUser } from "@/lib/session-user";
import { prismaSequential } from "@/lib/prisma-sequential";

export const dynamic = "force-dynamic";

/** Architecture stub — queues analysis job; generation not implemented yet. */
export const POST = withApiRoute("user.profile.ai-analysis.POST", async () => {
  const { userId } = await ensureSessionUser();
  const [sub, wallet] = await prismaSequential(
    () => getSubscriptionSnapshot(userId),
    () => getWalletSnapshot(userId, { skipEnsureBilling: true }),
  );

  const planId = (sub.plan as BillingPlanId) || "FREE";
  const features = getProfilePlanFeatures(planId);

  if (!features.aiProfileAnalysis) {
    return NextResponse.json(
      {
        error: "upgrade_required",
        message: "AI-разбор аккаунта доступен на тарифах Pro и выше.",
      },
      { status: 403 },
    );
  }

  const cost = AI_PROFILE_ANALYSIS_TOKEN_COST;
  if (wallet.balance < cost) {
    return NextResponse.json(
      {
        error: "insufficient_tokens",
        message: `Нужно ${cost} токенов. Пополните баланс.`,
        tokenCost: cost,
        balance: wallet.balance,
      },
      { status: 402 },
    );
  }

  const job = await prisma.userProfileAiAnalysis.create({
    data: {
      userId,
      status: "pending",
      tokenCost: cost,
    },
  });

  return NextResponse.json({
    jobId: job.id,
    status: "pending",
    message:
      "Запрос принят. Полный AI-разбор будет доступен после подключения генерации отчёта.",
    tokenCost: cost,
  });
});
