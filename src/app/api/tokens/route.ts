import { NextResponse } from "next/server";
import { getTokenBalance } from "@/lib/token-wallet";

export const dynamic = "force-dynamic";

export async function GET() {
  const balance = await getTokenBalance();
  return NextResponse.json({ balance });
}
