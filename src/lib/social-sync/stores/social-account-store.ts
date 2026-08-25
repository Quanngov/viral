import "server-only";

import { prisma } from "@/lib/prisma";
import type { SocialPlatform } from "@/lib/profile/profile-types";
import type {
  SocialConnectionHealth,
  SocialConnectionStatus,
  SocialSyncStatus,
  SocialUpdateStrategy,
  SyncTrigger,
} from "../social-sync.types";
import { DEFAULT_SYNC_INTERVAL_HOURS } from "../social-sync.types";

export type SocialAccountRecord = {
  id: string;
  userId: string;
  platform: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
  followers: number | null;
  followersPrev: number | null;
  totalLikes: number | null;
  avgViews: number | null;
  avgViewsPrev: number | null;
  avgEngagement: number | null;
  videoCount: number | null;
  monthlyViews: number | null;
  postingFreq: string;
  lastUploadAt: Date | null;
  growthPercent: number | null;
  bestVideoJson: unknown;
  statsSource: string;
  statsUpdatedAt: Date | null;
  authMethod: string;
  connectionStatus: string;
  connectionHealth: string;
  externalAccountId: string;
  syncStatus: string;
  updateStrategy: string;
  lastSyncAt: Date | null;
  lastSyncSuccessAt: Date | null;
  lastSyncFailedAt: Date | null;
  nextSyncAt: Date | null;
  lastSyncError: string;
  manualRefreshAt: Date | null;
};

function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 3600 * 1000);
}

export async function getSocialAccountById(id: string): Promise<SocialAccountRecord | null> {
  return prisma.userSocialAccount.findUnique({ where: { id } });
}

export async function getSocialAccount(
  userId: string,
  platform: SocialPlatform,
): Promise<SocialAccountRecord | null> {
  return prisma.userSocialAccount.findUnique({ where: { userId_platform: { userId, platform } } });
}

export async function listSocialAccountsForUser(userId: string): Promise<SocialAccountRecord[]> {
  return prisma.userSocialAccount.findMany({ where: { userId }, orderBy: { platform: "asc" } });
}

export async function listAccountsDueForSync(limit = 50): Promise<SocialAccountRecord[]> {
  const now = new Date();
  return prisma.userSocialAccount.findMany({
    where: {
      connectionStatus: "connected",
      OR: [{ nextSyncAt: null }, { nextSyncAt: { lte: now } }],
      syncStatus: { in: ["idle", "failed"] },
    },
    orderBy: { nextSyncAt: "asc" },
    take: limit,
  });
}

export async function findAccountByExternalId(
  platform: SocialPlatform,
  externalAccountId: string,
): Promise<SocialAccountRecord | null> {
  return prisma.userSocialAccount.findFirst({
    where: { platform, externalAccountId },
  });
}

export async function upsertManualSocialAccount(
  userId: string,
  platform: SocialPlatform,
  username: string,
): Promise<SocialAccountRecord> {
  const handle = username.replace(/^@/, "").trim();
  if (!handle) {
    await prisma.userSocialAccount.deleteMany({ where: { userId, platform } });
    throw new Error("empty_username");
  }
  return prisma.userSocialAccount.upsert({
    where: { userId_platform: { userId, platform } },
    create: {
      userId,
      platform,
      username: handle,
      displayName: handle,
      statsSource: "pending",
      authMethod: "manual",
      connectionStatus: "connected",
      connectionHealth: "degraded",
      syncStatus: "idle",
      nextSyncAt: hoursFromNow(DEFAULT_SYNC_INTERVAL_HOURS),
    },
    update: {
      username: handle,
      displayName: handle,
      authMethod: "manual",
      connectionStatus: "connected",
      connectionHealth: "degraded",
    },
  });
}

export async function applySyncResult(
  accountId: string,
  data: {
    displayName: string;
    avatarUrl: string;
    profileUrl: string;
    username: string;
    followers: number | null;
    totalLikes: number | null;
    avgViews: number | null;
    avgEngagement: number | null;
    videoCount: number | null;
    monthlyViews: number | null;
    postingFreq: string | null;
    lastUploadAt: Date | null;
    growthPercent: number | null;
    bestVideoJson: unknown;
    statsSource: string;
    connectionHealth: SocialConnectionHealth;
    updateStrategy?: SocialUpdateStrategy;
  },
): Promise<SocialAccountRecord> {
  const existing = await prisma.userSocialAccount.findUnique({ where: { id: accountId } });
  if (!existing) throw new Error("account_not_found");
  const now = new Date();
  return prisma.userSocialAccount.update({
    where: { id: accountId },
    data: {
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      profileUrl: data.profileUrl,
      username: data.username,
      followersPrev: existing.followers,
      followers: data.followers,
      totalLikes: data.totalLikes,
      avgViewsPrev: existing.avgViews,
      avgViews: data.avgViews,
      avgEngagement: data.avgEngagement,
      videoCount: data.videoCount,
      monthlyViews: data.monthlyViews,
      postingFreq: data.postingFreq ?? "",
      lastUploadAt: data.lastUploadAt,
      growthPercent: data.growthPercent,
      bestVideoJson: data.bestVideoJson ?? undefined,
      statsSource: data.statsSource,
      statsUpdatedAt: now,
      connectionHealth: data.connectionHealth,
      updateStrategy: data.updateStrategy ?? existing.updateStrategy,
      syncStatus: "idle",
      lastSyncAt: now,
      lastSyncSuccessAt: now,
      lastSyncError: "",
      nextSyncAt: hoursFromNow(DEFAULT_SYNC_INTERVAL_HOURS),
    },
  });
}

export async function markSyncFailed(
  accountId: string,
  error: string,
  health: SocialConnectionHealth = "error",
): Promise<void> {
  const now = new Date();
  await prisma.userSocialAccount.update({
    where: { id: accountId },
    data: {
      syncStatus: "failed",
      connectionHealth: health,
      lastSyncAt: now,
      lastSyncFailedAt: now,
      lastSyncError: error.slice(0, 500),
      nextSyncAt: hoursFromNow(1),
    },
  });
}

export async function updateAccountSyncStatus(
  accountId: string,
  syncStatus: SocialSyncStatus,
): Promise<void> {
  await prisma.userSocialAccount.update({ where: { id: accountId }, data: { syncStatus } });
}

export async function updateConnectionState(
  accountId: string,
  patch: {
    connectionStatus?: SocialConnectionStatus;
    connectionHealth?: SocialConnectionHealth;
    authMethod?: string;
    externalAccountId?: string;
    updateStrategy?: SocialUpdateStrategy;
    nextSyncAt?: Date | null;
  },
): Promise<void> {
  await prisma.userSocialAccount.update({ where: { id: accountId }, data: patch });
}

export async function deleteSocialAccount(userId: string, platform: SocialPlatform): Promise<void> {
  await prisma.userSocialAccount.deleteMany({ where: { userId, platform } });
}

export async function touchManualRefresh(accountId: string): Promise<void> {
  await prisma.userSocialAccount.update({
    where: { id: accountId },
    data: { manualRefreshAt: new Date() },
  });
}
