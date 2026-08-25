import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import {
  getLedgerPage,
  loadBillingBundle,
} from "@/lib/billing/billing-service";
import { ensureSessionUser } from "@/lib/session-user";
import { prismaSequential } from "@/lib/prisma-sequential";

export const dynamic = "force-dynamic";

export const GET = withApiRoute("billing.me.GET", async (req: Request) => {
  const { userId } = await ensureSessionUser();
  const url = new URL(req.url);
  const ledgerLimit = Math.min(100, Math.max(1, Number(url.searchParams.get("ledgerLimit") || 30)));
  const ledgerCursor = url.searchParams.get("cursor") ?? undefined;

  // loadBillingBundle reads subscription + wallet once each (with in-memory expiry);
  // then a single ledger page query.
  const [{ subscription, wallet }, ledger] = await prismaSequential(
    () => loadBillingBundle(userId),
    () => getLedgerPage(userId, ledgerLimit, ledgerCursor),
  );

  return NextResponse.json({ subscription, wallet, ledger });
});
