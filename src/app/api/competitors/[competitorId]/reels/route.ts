import { NextResponse } from "next/server";
import { syncInstagramCompetitorReelsFromTikHub } from "@/lib/competitor-instagram-reels-sync";
import { logAdminEvent, safeMeta } from "@/lib/admin-events";
import { prisma } from "@/lib/prisma";
import { ensureSessionUser, getTokenBalanceForUser, spendTokens } from "@/lib/token-wallet";

export const dynamic = "force-dynamic";

const INSTAGRAM_REFRESH_TOKEN_COST = 30;

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

  const spend = await spendTokens(userId, INSTAGRAM_REFRESH_TOKEN_COST, "competitor_instagram_refresh_reels", {
    sessionId: sessionKey,
  });
  if (!spend.ok) {
    await logAdminEvent({
      level: "warn",
      type: "competitor_add_error",
      message: "Недостаточно токенов для обновления Reels",
      sessionId: sessionKey,
      userId,
      meta: safeMeta({
        phase: "tokens",
        required: INSTAGRAM_REFRESH_TOKEN_COST,
        balance: spend.balance,
        platform: "instagram",
        action: "refresh",
      }),
    });
    return NextResponse.json(
      {
        ok: false,
        error: "insufficient_tokens",
        tokensOk: false,
        tokensRemaining: spend.balance,
        message: "Недостаточно внутренних токенов для обновления (нужно 30).",
      },
      { status: 402 },
    );
  }

  await logAdminEvent({
    level: "info",
    type: "competitor_token_spend",
    message: "Списание токенов за обновление Reels Instagram-конкурента",
    sessionId: sessionKey,
    userId,
    meta: safeMeta({
      amount: INSTAGRAM_REFRESH_TOKEN_COST,
      balanceAfter: spend.balance,
      platform: "instagram",
      username: competitor.externalId,
      action: "refresh_reels",
    }),
  });

  const syncResult = await syncInstagramCompetitorReelsFromTikHub({
    competitorId: competitor.id,
    username: competitor.externalId,
    userId,
    sessionKey,
  });

  const tokensRemaining = await getTokenBalanceForUser(userId);

  let message: string;
  if (syncResult.videosLoaded > 0) {
    message = `Обновлено, загружено ${syncResult.videosLoaded} роликов`;
  } else if (syncResult.reelsFetchFailed) {
    message = "Ролики не загрузились. Попробуйте обновить позже.";
  } else {
    message = "Ролики пока не найдены";
  }

  const fresh = await prisma.competitorAccount.findUnique({ where: { id: competitor.id } });

  return NextResponse.json({
    ok: true,
    competitor: fresh ?? competitor,
    videosSaved: syncResult.videosLoaded,
    tokensRemaining,
    message,
    warning: syncResult.warnings.length ? [...new Set(syncResult.warnings)].join(" ") : undefined,
  });
}
