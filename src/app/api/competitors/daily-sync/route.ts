import { NextResponse } from "next/server";
import { runCompetitorDailySync } from "@/lib/competitor-daily-sync";
import { ensureSessionUser } from "@/lib/token-wallet";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    visibleVideoLimit?: number;
    seenIds?: string[];
  };

  const action = body.action === "more" ? "more" : "initial";
  const visibleVideoLimit =
    typeof body.visibleVideoLimit === "number" && Number.isFinite(body.visibleVideoLimit)
      ? Math.floor(body.visibleVideoLimit)
      : undefined;

  const { userId, sessionKey } = await ensureSessionUser();

  const result = await runCompetitorDailySync({
    userId,
    sessionKey,
    action,
    visibleVideoLimit,
  });

  return NextResponse.json({
    ok: result.ok,
    syncBlocked: result.syncBlocked ?? false,
    oldDataAllowed: result.oldDataAllowed ?? false,
    reason: result.reason,
    tokensRemaining: result.tokensRemaining,
    chargedNewProfiles: result.chargedNewProfiles ?? 0,
    profilesSynced: result.profilesSynced ?? 0,
  });
}
