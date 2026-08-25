import "server-only";

import { logAdminEvent, safeMeta } from "@/lib/admin-events";
import type { SocialPlatform } from "@/lib/profile/profile-types";
import { getSocialProvider, isSocialPlatform, listSocialProviders } from "./provider-registry";
import { classifyHttpError, classifyNetworkError } from "./provider-utils";
import { checkRateLimit, getRateLimitSnapshot } from "./rate-limiter";
import {
  applySyncResult,
  findAccountByExternalId,
  getSocialAccount,
  getSocialAccountById,
  listAccountsDueForSync,
  markSyncFailed,
  touchManualRefresh,
  updateAccountSyncStatus,
  updateConnectionState,
  upsertManualSocialAccount,
  deleteSocialAccount,
  type SocialAccountRecord,
} from "./stores/social-account-store";
import { deleteOAuthCredentials, loadOAuthTokens, saveOAuthCredentials } from "./stores/oauth-credential-store";
import {
  claimPendingJobs,
  completeJob,
  enqueueSyncJob,
  listRecentJobs,
  countJobsByStatus,
  recoverStuckJobs,
  rescheduleJob,
} from "./stores/sync-job-store";
import { createSnapshot } from "./stores/snapshot-store";
import {
  listPendingWebhookEvents,
  listWebhookAdminSummary,
  markWebhookEvent,
  recordWebhookEvent,
  touchWebhookFailure,
  touchWebhookSuccess,
  upsertWebhookSubscription,
} from "./stores/webhook-store";
import { prismaSequential } from "@/lib/prisma-sequential";
import type {
  OAuthConnectInput,
  ProviderContext,
  SocialUpdateStrategy,
  SyncTrigger,
} from "./social-sync.types";
import { DEFAULT_SYNC_INTERVAL_HOURS, MANUAL_REFRESH_COOLDOWN_MINUTES } from "./social-sync.types";

function appOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

function oauthRedirectUri(platform: SocialPlatform): string {
  if (platform === "youtube" && process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim()) {
    return process.env.GOOGLE_OAUTH_REDIRECT_URI.trim();
  }
  if (platform === "instagram" && process.env.META_OAUTH_REDIRECT_URI?.trim()) {
    return process.env.META_OAUTH_REDIRECT_URI.trim();
  }
  if (platform === "tiktok" && process.env.TIKTOK_OAUTH_REDIRECT_URI?.trim()) {
    return process.env.TIKTOK_OAUTH_REDIRECT_URI.trim();
  }
  return `${appOrigin()}/api/social/oauth/${platform}/callback`;
}

async function buildProviderContext(account: SocialAccountRecord): Promise<ProviderContext> {
  const tokens = await loadOAuthTokens(account.id);
  return {
    accountId: account.id,
    userId: account.userId,
    platform: account.platform as SocialPlatform,
    externalAccountId: account.externalAccountId,
    username: account.username,
    accessToken: tokens?.accessToken,
    refreshToken: tokens?.refreshToken,
    tokenExpiresAt: tokens?.expiresAt ?? null,
    scopes: tokens?.scopes,
    providerUserId: tokens?.providerUserId || undefined,
  };
}

async function writeSyncLog(
  accountId: string,
  platform: string,
  trigger: SyncTrigger,
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  await prisma.socialSyncLog.create({
    data: {
      socialAccountId: accountId,
      platform,
      trigger,
      level,
      message,
      metaJson: meta ?? undefined,
    },
  });
  if (level === "error") {
    void logAdminEvent({
      level: "error",
      type: "api_route_error",
      message,
      throttleKey: `social_sync:${platform}:${accountId}`,
      meta: safeMeta({ accountId, platform, trigger, ...meta }),
    });
  }
}

function resolveUpdateStrategy(platform: SocialPlatform): SocialUpdateStrategy {
  const provider = getSocialProvider(platform);
  return provider.capabilities.webhooks ? "hybrid" : "polling";
}

/** Central social synchronization service — all platforms flow through here. */
export class SocialSyncService {
  static buildOAuthUrl(platform: SocialPlatform, state: string): string | null {
    const provider = getSocialProvider(platform);
    return provider.buildAuthorizationUrl(state, oauthRedirectUri(platform));
  }

  static async connectOAuth(input: OAuthConnectInput): Promise<SocialAccountRecord> {
    const provider = getSocialProvider(input.platform);
    const result = await provider.connect({ ...input, redirectUri: oauthRedirectUri(input.platform) });
    // Providers may return null (legacy) or throw with a real provider error (e.g. MetaGraphError).
    // Never replace a thrown provider error with a generic oauth_connect_failed.
    if (!result) throw new Error("oauth_connect_failed");

    const strategy = resolveUpdateStrategy(input.platform);
    const account = await upsertManualSocialAccount(input.userId, input.platform, result.username);
    await updateConnectionState(account.id, {
      connectionStatus: "connected",
      connectionHealth: "healthy",
      authMethod: "oauth",
      externalAccountId: result.externalAccountId,
      updateStrategy: strategy,
      nextSyncAt: new Date(),
    });

    await prismaPatchAccountProfile(account.id, result);
    await saveOAuthCredentials(account.id, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
      scopes: result.scopes,
      providerUserId: result.providerUserId ?? result.externalAccountId,
    });

    const jobId = await enqueueSyncJob({
      socialAccountId: account.id,
      platform: input.platform,
      trigger: "initial",
      priority: 20,
    });

    // Run the first sync synchronously so the profile shows real stats immediately
    // (there is no background worker in dev; the cron only runs in production).
    // On failure the job is left pending/failed for the cron to retry — the account
    // stays connected either way.
    try {
      await SocialSyncService.executeSyncJob(jobId, account.id, input.platform, "initial");
      await completeJob(jobId, "completed");
    } catch {
      await rescheduleJob(jobId, new Date(Date.now() + 60_000), "initial_sync_failed");
    }

    if (provider.capabilities.webhooks) {
      await SocialSyncService.registerWebhooksForAccount(account.id);
    }

    return (await getSocialAccountById(account.id))!;
  }

  static async disconnect(userId: string, platform: SocialPlatform): Promise<void> {
    const account = await getSocialAccount(userId, platform);
    if (!account) return;

    const { prisma } = await import("@/lib/prisma");
    await prisma.socialSyncJob.updateMany({
      where: { socialAccountId: account.id, status: { in: ["pending", "running"] } },
      data: { status: "failed", lastError: "account_disconnected", completedAt: new Date() },
    });

    const ctx = await buildProviderContext(account);
    await getSocialProvider(platform).disconnect(ctx);
    await deleteOAuthCredentials(account.id);
    await deleteSocialAccount(userId, platform);
  }

  static async enqueueSync(
    accountId: string,
    trigger: SyncTrigger,
    priority?: number,
  ): Promise<string> {
    const account = await getSocialAccountById(accountId);
    if (!account) throw new Error("account_not_found");
    await updateAccountSyncStatus(accountId, "queued");
    return enqueueSyncJob({
      socialAccountId: accountId,
      platform: account.platform,
      trigger,
      priority,
    });
  }

  static async manualRefresh(userId: string, platform: SocialPlatform): Promise<{ jobId: string; queued: boolean }> {
    const account = await getSocialAccount(userId, platform);
    if (!account || account.connectionStatus !== "connected") {
      throw new Error("not_connected");
    }
    if (account.manualRefreshAt) {
      const cooldown = MANUAL_REFRESH_COOLDOWN_MINUTES * 60_000;
      if (Date.now() - account.manualRefreshAt.getTime() < cooldown) {
        throw new Error("cooldown");
      }
    }
    await touchManualRefresh(account.id);
    const jobId = await SocialSyncService.enqueueSync(account.id, "manual", 30);
    return { jobId, queued: true };
  }

  static async runScheduledSyncs(): Promise<{ enqueued: number }> {
    const due = await listAccountsDueForSync(100);
    let enqueued = 0;
    for (const account of due) {
      await SocialSyncService.enqueueSync(account.id, "scheduled");
      enqueued += 1;
    }
    return { enqueued };
  }

  static async processQueue(batchSize = 10): Promise<{ processed: number; failed: number }> {
    await recoverStuckJobs();
    const jobs = await claimPendingJobs(batchSize);
    let processed = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        await SocialSyncService.executeSyncJob(job.id, job.socialAccountId, job.platform as SocialPlatform, job.trigger as SyncTrigger);
        await completeJob(job.id, "completed");
        processed += 1;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await rescheduleJob(job.id, new Date(Date.now() + 60_000), msg);
        failed += 1;
      }
    }

    await SocialSyncService.processWebhookQueue(20);
    return { processed, failed };
  }

  static async executeSyncJob(
    jobId: string,
    accountId: string,
    platform: SocialPlatform,
    trigger: SyncTrigger,
  ): Promise<void> {
    const account = await getSocialAccountById(accountId);
    if (!account) throw new Error("account_not_found");

    const rate = checkRateLimit(platform);
    if (!rate.allowed) {
      await rescheduleJob(jobId, new Date(Date.now() + (rate.retryAfterMs ?? 60_000)), "rate_limited");
      return;
    }

    await updateAccountSyncStatus(accountId, "running");
    const provider = getSocialProvider(platform);
    let ctx = await buildProviderContext(account);

    if (account.authMethod === "oauth" && ctx.accessToken) {
      let validation = await provider.validateConnection(ctx);

      if (!validation.valid && provider.refreshAccessToken) {
        const refreshed = await provider.refreshAccessToken(ctx);
        if (refreshed?.accessToken) {
          await saveOAuthCredentials(accountId, {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken ?? ctx.refreshToken,
            expiresAt: refreshed.expiresAt,
            providerUserId: ctx.providerUserId ?? account.externalAccountId,
            scopes: ctx.scopes,
          });
          const reloaded = await getSocialAccountById(accountId);
          if (reloaded) ctx = await buildProviderContext(reloaded);
          validation = await provider.validateConnection(ctx);
        }
      }

      if (!validation.valid) {
        // Token cannot be refreshed — require explicit user reconnection (do not fail silently).
        await markSyncFailed(
          accountId,
          validation.errorMessage || "OAuth token invalid — reconnect required",
          "revoked",
        );
        await updateConnectionState(accountId, {
          connectionStatus: "revoked",
          connectionHealth: "revoked",
        });
        await writeSyncLog(accountId, platform, trigger, "error", "token_revoked_reconnect_required", {
          errorCode: validation.errorCode,
          errorMessage: validation.errorMessage,
        });
        throw new Error("token_revoked");
      }
    }

    if (account.authMethod === "manual") {
      await writeSyncLog(accountId, platform, trigger, "info", "Manual account — metrics pending OAuth");
      await updateAccountSyncStatus(accountId, "idle");
      return;
    }

    try {
      const refresh = await provider.refresh(ctx);
      await applySyncResult(accountId, {
        displayName: refresh.profile.displayName,
        avatarUrl: refresh.profile.avatarUrl,
        profileUrl: refresh.profile.profileUrl,
        username: refresh.profile.username,
        followers: refresh.profile.followers,
        totalLikes: refresh.profile.totalLikes,
        avgViews: refresh.videos.avgViews,
        avgEngagement: refresh.analytics.avgEngagement,
        videoCount: refresh.videos.videoCount ?? refresh.profile.videoCount,
        monthlyViews: refresh.analytics.monthlyViews,
        postingFreq: refresh.analytics.postingFreq,
        lastUploadAt: refresh.videos.lastUploadAt,
        growthPercent: refresh.analytics.growthPercent,
        bestVideoJson: refresh.videos.bestVideo,
        statsSource: refresh.statsSource,
        connectionHealth: refresh.statsSource === "api" ? "healthy" : "degraded",
        updateStrategy: resolveUpdateStrategy(platform),
      });

      await createSnapshot(accountId, platform, {
        followers: refresh.profile.followers,
        totalLikes: refresh.profile.totalLikes,
        avgViews: refresh.videos.avgViews,
        avgEngagement: refresh.analytics.avgEngagement,
        videoCount: refresh.videos.videoCount,
        monthlyViews: refresh.analytics.monthlyViews,
        totalComments: refresh.videos.totalComments,
        engagementRate: refresh.analytics.engagementRate,
        rawJson: refresh.rawJson,
      });

      await writeSyncLog(accountId, platform, trigger, "info", "Sync completed", {
        statsSource: refresh.statsSource,
      });
    } catch (error) {
      const classified =
        error && typeof error === "object" && "status" in error
          ? classifyHttpError((error as { status: number }).status)
          : classifyNetworkError(error);
      await markSyncFailed(
        accountId,
        classified.message,
        classified.code === "token_revoked" || classified.code === "token_expired" ? "revoked" : "error",
      );
      if (classified.code === "token_revoked" || classified.code === "token_expired") {
        await updateConnectionState(accountId, {
          connectionStatus: "revoked",
          connectionHealth: "revoked",
        });
      }
      await writeSyncLog(accountId, platform, trigger, "error", classified.message, { code: classified.code });
      if (!classified.retryable) await completeJob(jobId, "failed", classified.message);
      throw error;
    }
  }

  static async registerWebhooksForAccount(accountId: string): Promise<void> {
    const account = await getSocialAccountById(accountId);
    if (!account) return;
    const platform = account.platform as SocialPlatform;
    const provider = getSocialProvider(platform);
    if (!provider.capabilities.webhooks || !provider.registerWebhook) return;

    const callbackUrl = `${appOrigin()}/api/social/webhooks/${platform}`;
    const ctx = await buildProviderContext(account);
    const reg = await provider.registerWebhook(ctx, callbackUrl);
    if (!reg) return;

    await upsertWebhookSubscription({
      socialAccountId: accountId,
      platform,
      externalSubId: reg.externalSubId,
      callbackUrl: reg.callbackUrl,
      topics: reg.topics,
      status: "active",
    });
    await updateConnectionState(accountId, { updateStrategy: "hybrid" });
  }

  static async handleWebhook(
    platform: SocialPlatform,
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<Response | null> {
    const provider = getSocialProvider(platform);

    if (provider.verifyWebhook) {
      const verified = provider.verifyWebhook(headers, rawBody);
      if (verified.challenge) {
        return new Response(verified.challenge, { status: 200 });
      }
      if (!verified.valid) return new Response("invalid signature", { status: 401 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = { raw: rawBody };
    }

    if (!provider.handleWebhookEvent) return new Response("ok", { status: 200 });
    const handled = await provider.handleWebhookEvent(payload);
    if (!handled) return new Response("ok", { status: 200 });

    const account = handled.accountExternalId
      ? await findAccountByExternalId(platform, handled.accountExternalId)
      : null;

    if (account) {
      const sub = await upsertWebhookSubscription({
        socialAccountId: account.id,
        platform,
        externalSubId: handled.accountExternalId || platform,
        callbackUrl: `${appOrigin()}/api/social/webhooks/${platform}`,
        topics: [handled.eventType],
      });
      const event = await recordWebhookEvent({
        subscriptionId: sub.id,
        platform,
        eventType: handled.eventType,
        externalEventId: handled.externalEventId,
        payload,
      });
      if (handled.enqueueSync) {
        await SocialSyncService.enqueueSync(account.id, "webhook", 15);
      }
      await touchWebhookSuccess(sub.id);
      await markWebhookEvent(event.id, "processed");
    }

    return new Response("ok", { status: 200 });
  }

  static async processWebhookQueue(limit = 20): Promise<void> {
    const events = await listPendingWebhookEvents(limit);
    for (const event of events) {
      try {
        const account = event.subscription.socialAccount;
        if (account) {
          await SocialSyncService.enqueueSync(account.id, "webhook", 12);
        }
        await markWebhookEvent(event.id, "processed");
        await touchWebhookSuccess(event.subscriptionId);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await markWebhookEvent(event.id, "failed", msg);
        await touchWebhookFailure(event.subscriptionId);
        const { prisma } = await import("@/lib/prisma");
        await prisma.socialWebhookEvent.update({
          where: { id: event.id },
          data: { retryAfter: new Date(Date.now() + 5 * 60_000) },
        });
      }
    }
  }

  static getProviderHealth() {
    return listSocialProviders().map((p) => ({
      platform: p.platform,
      capabilities: p.capabilities,
      rateLimit: checkRateLimit(p.platform),
    }));
  }

  static async getAdminOverview() {
    const [jobsByStatus, recentJobs, webhooks] = await prismaSequential(
      () => countJobsByStatus(),
      () => listRecentJobs(40),
      () => listWebhookAdminSummary(),
    );
    return {
      jobsByStatus,
      recentJobs,
      webhooks,
      rateLimits: getRateLimitSnapshot(),
      providers: SocialSyncService.getProviderHealth(),
    };
  }
}

async function prismaPatchAccountProfile(
  accountId: string,
  result: {
    username: string;
    displayName: string;
    avatarUrl: string;
    profileUrl: string;
    externalAccountId: string;
  },
): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  await prisma.userSocialAccount.update({
    where: { id: accountId },
    data: {
      username: result.username,
      displayName: result.displayName,
      avatarUrl: result.avatarUrl,
      profileUrl: result.profileUrl,
      externalAccountId: result.externalAccountId,
    },
  });
}
