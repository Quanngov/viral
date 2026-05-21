import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { getTokenBalance } from "@/lib/token-wallet";

export const dynamic = "force-dynamic";

export const GET = withApiRoute("tokens.GET", async () => {
  const balance = await getTokenBalance();
  return NextResponse.json({ balance });
});
