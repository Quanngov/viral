import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { buildProfileHubPayload, upsertSocialAccount } from "@/lib/profile/profile-hub-service";
import type { SocialPlatform } from "@/lib/profile/profile-types";
import { ensureSessionUser } from "@/lib/session-user";

export const dynamic = "force-dynamic";

const PLATFORMS = new Set<string>(["instagram", "tiktok", "youtube"]);

export const POST = withApiRoute("user.profile.social.POST", async (req: Request) => {
  const { userId } = await ensureSessionUser();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const platform = typeof o.platform === "string" ? o.platform.trim() : "";
  const username = typeof o.username === "string" ? o.username.trim() : "";

  if (!PLATFORMS.has(platform)) {
    return NextResponse.json({ error: "invalid_platform" }, { status: 400 });
  }

  await upsertSocialAccount(userId, platform as SocialPlatform, username);
  const hub = await buildProfileHubPayload(userId);
  return NextResponse.json({ hub });
});

export const DELETE = withApiRoute("user.profile.social.DELETE", async (req: Request) => {
  const { userId } = await ensureSessionUser();
  const url = new URL(req.url);
  const platform = url.searchParams.get("platform")?.trim() ?? "";

  if (!PLATFORMS.has(platform)) {
    return NextResponse.json({ error: "invalid_platform" }, { status: 400 });
  }

  const { removeSocialAccount } = await import("@/lib/profile/profile-hub-service");
  await removeSocialAccount(userId, platform as SocialPlatform);
  const hub = await buildProfileHubPayload(userId);
  return NextResponse.json({ hub });
});
