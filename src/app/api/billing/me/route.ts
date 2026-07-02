import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import {
  getLedgerPage,
  getSubscriptionSnapshot,
  getWalletSnapshot,
} from "@/lib/billing/billing-service";
import { ensureSessionUser } from "@/lib/token-wallet";

export const dynamic = "force-dynamic";

export const GET = withApiRoute("billing.me.GET", async (req: Request) => {
  const { userId } = await ensureSessionUser();
  const url = new URL(req.url);
  const ledgerLimit = Math.min(100, Math.max(1, Number(url.searchParams.get("ledgerLimit") || 30)));
  const ledgerCursor = url.searchParams.get("cursor") ?? undefined;

  const [subscription, wallet, ledger] = await Promise.all([
    getSubscriptionSnapshot(userId),
    getWalletSnapshot(userId),
    getLedgerPage(userId, ledgerLimit, ledgerCursor),
  ]);

  return NextResponse.json({ subscription, wallet, ledger });
});
