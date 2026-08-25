/**
 * Instagram OAuth lifecycle test (mocked Instagram Login Graph API + real SocialSyncService/DB).
 *
 * Run: npx tsx --env-file=.env scripts/test-instagram-lifecycle.ts
 */
import Module from "node:module";
import { randomBytes } from "node:crypto";

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function (...args: unknown[]) {
  const request = args[0];
  if (request === "server-only") return {};
  return originalLoad.apply(this, args);
};

process.env.INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID || "test-ig-app-id";
process.env.INSTAGRAM_APP_SECRET =
  process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET || "test-ig-app-secret";
process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-auth-secret-for-instagram-lifecycle";
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const IG_USER_ID = "17841400000000001";
const USER_TOKEN_SHORT = "IG_SHORT_LIVED_TOKEN";
const USER_TOKEN_LONG = "IG_LONG_LIVED_TOKEN";
const USER_TOKEN_REFRESHED = "IG_LONG_LIVED_TOKEN_V2";

function ok(name: string, detail?: string) {
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail: string): never {
  console.error(`✗ ${name} — ${detail}`);
  throw new Error(`FAIL: ${name}: ${detail}`);
}

function parseUrl(input: string): URL {
  return new URL(input);
}

function mockIgFetch(): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method || "GET").toUpperCase();
    const u = parseUrl(url);

    // Code → short-lived (api.instagram.com)
    if (u.hostname === "api.instagram.com" && u.pathname.endsWith("/oauth/access_token")) {
      return new Response(
        JSON.stringify({
          access_token: USER_TOKEN_SHORT,
          user_id: IG_USER_ID,
          permissions: "instagram_business_basic,instagram_business_manage_insights",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // Short → long-lived
    if (u.pathname.endsWith("/access_token") && u.searchParams.get("grant_type") === "ig_exchange_token") {
      const incoming = u.searchParams.get("access_token");
      if (incoming === "DEAD_TOKEN") {
        return new Response(JSON.stringify({ error: { message: "Invalid OAuth access token.", code: 190 } }), {
          status: 400,
        });
      }
      return new Response(
        JSON.stringify({ access_token: USER_TOKEN_LONG, token_type: "bearer", expires_in: 5_183_944 }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // Refresh long-lived
    if (u.pathname.endsWith("/refresh_access_token")) {
      const incoming = u.searchParams.get("access_token");
      if (incoming === "DEAD_TOKEN" || incoming === "REVOKED_TOKEN") {
        return new Response(JSON.stringify({ error: { message: "Session has expired", code: 190 } }), {
          status: 401,
        });
      }
      return new Response(
        JSON.stringify({ access_token: USER_TOKEN_REFRESHED, token_type: "bearer", expires_in: 5_183_944 }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // /me or /{id} profile
    if (
      (u.pathname.includes("/me") || u.pathname.includes(`/${IG_USER_ID}`)) &&
      !u.pathname.includes("/media") &&
      !u.pathname.includes("/insights")
    ) {
      const token = u.searchParams.get("access_token") || "";
      if (token === "REVOKED_TOKEN" || token === "DEAD_TOKEN") {
        return new Response(JSON.stringify({ error: { message: "Invalid OAuth access token.", code: 190 } }), {
          status: 401,
        });
      }
      return new Response(
        JSON.stringify({
          id: IG_USER_ID,
          user_id: IG_USER_ID,
          username: "viral_test_ig",
          name: "Viral Test",
          profile_picture_url: "https://example.com/avatar.jpg",
          followers_count: 1234,
          media_count: 42,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (u.pathname.includes(`/${IG_USER_ID}/media`)) {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "m1",
              caption: "First reel",
              media_type: "VIDEO",
              timestamp: "2026-07-01T12:00:00+0000",
              permalink: "https://instagram.com/p/abc",
              thumbnail_url: "https://example.com/t1.jpg",
              like_count: 100,
              comments_count: 10,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (u.pathname.includes(`/${IG_USER_ID}/insights`)) {
      return new Response(
        JSON.stringify({
          data: [
            { name: "views", values: [{ value: 1000 }, { value: 2000 }] },
            { name: "reach", values: [{ value: 800 }, { value: 900 }] },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    console.warn("Unmocked fetch:", method, url);
    return new Response(JSON.stringify({ error: "unmocked" }), { status: 500 });
  }) as typeof fetch;

  return () => {
    globalThis.fetch = original;
  };
}

async function main() {
  const restore = mockIgFetch();
  try {
    const { instagramProvider } = await import("../src/lib/social-sync/providers/instagram-provider");
    const { SocialSyncService } = await import("../src/lib/social-sync/social-sync-service");
    const { prisma } = await import("../src/lib/prisma");
    const { loadOAuthTokens, saveOAuthCredentials } = await import(
      "../src/lib/social-sync/stores/oauth-credential-store"
    );

    const authUrl = instagramProvider.buildAuthorizationUrl(
      "state-test",
      "http://localhost:3000/api/social/oauth/instagram/callback",
    );
    if (!authUrl?.includes("instagram.com/oauth/authorize")) fail("buildAuthorizationUrl host", String(authUrl));
    if (!authUrl.includes("instagram_business_basic") || !authUrl.includes("instagram_business_manage_insights")) {
      fail("buildAuthorizationUrl scopes", authUrl);
    }
    if (authUrl.includes("instagram_basic") || authUrl.includes("pages_read_engagement")) {
      fail("buildAuthorizationUrl legacy scopes present", authUrl);
    }
    ok("buildAuthorizationUrl", "instagram_business_* on instagram.com");

    const connect = await instagramProvider.connect({
      userId: "test",
      platform: "instagram",
      code: "auth-code",
      redirectUri: "http://localhost:3000/api/social/oauth/instagram/callback",
    });
    if (!connect) fail("connect", "returned null");
    if (connect.accessToken !== USER_TOKEN_LONG) fail("connect token", connect.accessToken);
    if (connect.externalAccountId !== IG_USER_ID) fail("connect ig id", connect.externalAccountId);
    if (connect.username !== "viral_test_ig") fail("connect username", connect.username);
    ok("connect", `user=@${connect.username} long-lived IG token`);

    const sessionKey = `ig-lifecycle-${randomBytes(6).toString("hex")}`;
    const sessionUser = await prisma.sessionUser.create({ data: { sessionKey } });
    const userId = sessionUser.id;

    try {
      const account = await SocialSyncService.connectOAuth({
        userId,
        platform: "instagram",
        code: "auth-code-2",
        redirectUri: "http://localhost:3000/api/social/oauth/instagram/callback",
      });
      if (account.connectionStatus !== "connected") fail("connectOAuth status", account.connectionStatus);
      if (account.followers !== 1234) fail("initial sync followers", String(account.followers));
      if (account.monthlyViews !== 3000) fail("initial sync monthlyViews", String(account.monthlyViews));
      ok("connectOAuth + initial sync", `followers=${account.followers} monthlyViews=${account.monthlyViews}`);

      const tokens = await loadOAuthTokens(account.id);
      if (tokens?.accessToken !== USER_TOKEN_LONG) fail("stored access token", String(tokens?.accessToken));
      ok("encrypted credentials persisted");

      const refreshed = await instagramProvider.refreshAccessToken!({
        accountId: account.id,
        userId,
        platform: "instagram",
        externalAccountId: IG_USER_ID,
        username: "viral_test_ig",
        accessToken: USER_TOKEN_LONG,
        refreshToken: USER_TOKEN_LONG,
        providerUserId: IG_USER_ID,
      });
      if (!refreshed || refreshed.accessToken !== USER_TOKEN_REFRESHED) {
        fail("refreshAccessToken", JSON.stringify(refreshed));
      }
      ok("refreshAccessToken", "ig_refresh_token");

      await saveOAuthCredentials(account.id, {
        accessToken: "REVOKED_TOKEN",
        refreshToken: "DEAD_TOKEN",
        providerUserId: IG_USER_ID,
      });
      const jobId = await SocialSyncService.enqueueSync(account.id, "manual", 50);
      let revoked = false;
      try {
        await SocialSyncService.executeSyncJob(jobId, account.id, "instagram", "manual");
      } catch (e) {
        revoked = e instanceof Error && e.message === "token_revoked";
      }
      if (!revoked) fail("token_revoked path", "expected token_revoked");
      const after = await prisma.userSocialAccount.findUnique({ where: { id: account.id } });
      if (after?.connectionStatus !== "revoked") fail("revoked status", String(after?.connectionStatus));
      ok("unrecoverable token → revoked");

      await saveOAuthCredentials(account.id, {
        accessToken: USER_TOKEN_LONG,
        refreshToken: USER_TOKEN_LONG,
        providerUserId: IG_USER_ID,
      });
      await prisma.userSocialAccount.update({
        where: { id: account.id },
        data: { connectionStatus: "connected", connectionHealth: "healthy" },
      });

      await SocialSyncService.disconnect(userId, "instagram");
      const gone = await prisma.userSocialAccount.findUnique({ where: { id: account.id } });
      if (gone) fail("disconnect cleanup", "account still present");
      ok("disconnect");

      const reconnected = await SocialSyncService.connectOAuth({
        userId,
        platform: "instagram",
        code: "auth-code-reconnect",
        redirectUri: "http://localhost:3000/api/social/oauth/instagram/callback",
      });
      if (reconnected.connectionStatus !== "connected") fail("reconnect", reconnected.connectionStatus);
      ok("reconnect");
      await SocialSyncService.disconnect(userId, "instagram");
    } finally {
      await prisma.sessionUser.delete({ where: { id: userId } }).catch(() => null);
    }

    console.log("\nAll Instagram lifecycle checks passed.");
  } finally {
    restore();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
