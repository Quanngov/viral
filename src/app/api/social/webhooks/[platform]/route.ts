import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { SocialSyncService } from "@/lib/social-sync/social-sync-service";
import { isSocialPlatform } from "@/lib/social-sync/provider-registry";

export const dynamic = "force-dynamic";

async function toNextResponse(response: Response | null): Promise<NextResponse> {
  if (!response) return new NextResponse("ok", { status: 200 });
  const body = await response.text();
  const headers = new Headers();
  response.headers.forEach((v, k) => headers.set(k, v));
  return new NextResponse(body, { status: response.status, headers });
}

export const POST = withApiRoute("social.webhooks.POST", async (req: Request, ctx) => {
  const params = await ctx?.params;
  const platform = params?.platform?.trim() ?? "";
  if (!isSocialPlatform(platform)) {
    return new NextResponse("invalid platform", { status: 400 });
  }

  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });

  const response = await SocialSyncService.handleWebhook(platform, rawBody, headers);
  return toNextResponse(response);
});

export const GET = withApiRoute("social.webhooks.GET", async (req: Request, ctx) => {
  const params = await ctx?.params;
  const platform = params?.platform?.trim() ?? "";
  if (!isSocialPlatform(platform)) {
    return new NextResponse("invalid platform", { status: 400 });
  }

  const rawBody = "";
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });

  const response = await SocialSyncService.handleWebhook(platform, rawBody, headers);
  return toNextResponse(response);
});
