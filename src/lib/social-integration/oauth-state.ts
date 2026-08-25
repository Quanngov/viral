import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import type { SocialPlatform } from "@/lib/profile/profile-types";

const STATE_TTL_MS = 10 * 60 * 1000;

function stateSecret(): string {
  return process.env.SOCIAL_OAUTH_STATE_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "dev-oauth-state";
}

export function createOAuthState(userId: string, platform: SocialPlatform): string {
  const payload = {
    userId,
    platform,
    nonce: randomBytes(8).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function parseOAuthState(state: string): { userId: string; platform: SocialPlatform } | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      userId?: string;
      platform?: SocialPlatform;
      exp?: number;
    };
    if (!parsed.userId || !parsed.platform || !parsed.exp || parsed.exp < Date.now()) return null;
    return { userId: parsed.userId, platform: parsed.platform };
  } catch {
    return null;
  }
}
