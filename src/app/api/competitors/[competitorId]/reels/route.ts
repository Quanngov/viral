import { NextResponse } from "next/server";
import { syncInstagramCompetitorReelsFromTikHub } from "@/lib/competitor-instagram-reels-sync";
import { getActionTokenCost } from "@/lib/billing/billing.config";
import { logAdminEvent, safeMeta } from "@/lib/admin-events";
import { prisma } from "@/lib/prisma";
import { ensureSessionUser, spendTokens } from "@/lib/token-wallet";

export const dynamic = "force-dynamic";

const REFRESH_COST = getActionTokenCost("REFRESH_COMPETITOR");

type RouteCtx = { params: Promise<{ competitorId: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
  const { competitorId } = await ctx.params;
  if (!competitorId?.trim()) {
    return NextResponse.json({ error: "bad_request", message: "Не указан конкурент" }, { status: 400 });
  }

  const { userId, sessionKey } = await ensureSessionUser();

  const competitor = await prisma.competitorAccount.findFirst({
    where: { id: competitorId.trim(), userId },
  });

  if (!competitor) {
    return NextResponse.json({ error: "not_found", message: "Конкурент не найден" }, { status: 404 });
  }

  if (competitor.platform !== "instagram") {
    return NextResponse.json(
      { error: "not_instagram", message: "Обновление Reels доступно только для Instagram" },
      { status: 400 },
    );
  }

  await logAdminEvent({
    level: "info",
    type: "api_fetch",
    message: "Запрос обновления Reels Instagram-конкурента",
    sessionId: sessionKey,
    userId,
    meta: safeMeta({
      mode: "competitor_reels_refresh",
      competitorId: competitor.id,
      username: competitor.externalId,
    }),
  });

  if (!process.env.TIKHUB_TOKEN?.trim()) {
    await logAdminEvent({
      level: "error",
      type: "competitor_add_error",
      message: "TikHub не настроен (нет TIKHUB_TOKEN)",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({ phase: "config", platform: "instagram", action: "refresh" }),
    });
    return NextResponse.json(
      {
        ok: false,
        error: "tikhub_unconfigured",
        message: "TikHub не настроен. Задайте TIKHUB_TOKEN в .env",
      },
      { status: 503 },
    );
  }

  const spend = await spendTokens(userId, REFRESH_COST, "competitor_instagram_refresh_reels", {
    sessionId: sessionKey,
  });
  if (!spend.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "insufficient_tokens",
        tokensRemaining: spend.balance,
        message: `Недостаточно токенов (нужно ${REFRESH_COST}).`,
      },
      { status: 402 },
    );
  }

  const syncResult = await syncInstagramCompetitorReelsFromTikHub({
    competitorId: competitor.id,
    username: competitor.externalId,
    userId,
    sessionKey,
  });

  await logAdminEvent({
    level: "info",
    type: "competitor_token_spend",
    message: "Списание токенов за обновление Reels",
    sessionId: sessionKey,
    userId,
    meta: safeMeta({
      amount: REFRESH_COST,
      balanceAfter: spend.balance,
      competitorId: competitor.id,
    }),
  });

  return NextResponse.json({
    ok: true,
    competitorId: competitor.id,
    videosLoaded: syncResult.videosLoaded,
    successfulPages: syncResult.successfulPages,
    warnings: syncResult.warnings,
    tokensRemaining: spend.balance,
  });
}
