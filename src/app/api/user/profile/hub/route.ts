import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { buildProfileHubPayload } from "@/lib/profile/profile-hub-service";
import { ensureSessionUser } from "@/lib/session-user";

export const dynamic = "force-dynamic";

export const GET = withApiRoute("user.profile.hub.GET", async () => {
  const { userId } = await ensureSessionUser();
  const hub = await buildProfileHubPayload(userId);
  return NextResponse.json({ hub });
});
