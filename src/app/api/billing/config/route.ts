import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { getPublicBillingConfig } from "@/lib/billing/billing.config";

export const dynamic = "force-dynamic";

export const GET = withApiRoute("billing.config.GET", async () => {
  return NextResponse.json(getPublicBillingConfig());
});
