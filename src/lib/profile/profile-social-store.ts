import "server-only";

import { prisma } from "@/lib/prisma";
import type { SocialPlatform } from "@/lib/profile/profile-types";

export type SocialRow = {
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

export async function listSocialAccounts(userId: string): Promise<SocialRow[]> {
  return prisma.userSocialAccount.findMany({
    where: { userId },
    orderBy: { platform: "asc" },
  });
}

export async function upsertSocialAccountRow(
  userId: string,
  platform: SocialPlatform,
  username: string,
): Promise<void> {
  const handle = username.replace(/^@/, "").trim();
  if (!handle) {
    await prisma.userSocialAccount.deleteMany({ where: { userId, platform } });
    return;
  }

  const existing = await prisma.userSocialAccount.findUnique({
    where: { userId_platform: { userId, platform } },
    select: { authMethod: true },
  });

  const manualPatch = {
    username: handle,
    displayName: handle,
    authMethod: "manual" as const,
    connectionStatus: "connected" as const,
  };

  await prisma.userSocialAccount.upsert({
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
    },
    update: existing?.authMethod === "oauth" ? { username: handle, displayName: handle } : manualPatch,
  });
}

export async function deleteSocialAccountRow(userId: string, platform: SocialPlatform): Promise<void> {
  await prisma.userSocialAccount.deleteMany({ where: { userId, platform } });
}

export async function updateSocialAccountStats(
  userId: string,
  platform: SocialPlatform,
  data: {
    displayName: string;
    avatarUrl: string;
    profileUrl: string;
    followers: number | null;
    totalLikes: number | null;
    avgViews: number | null;
    avgEngagement: number | null;
    postingFreq: string | null;
    lastUploadAt: Date | null;
    growthPercent: number | null;
    bestVideoJson: unknown;
    statsSource: string;
    statsUpdatedAt: Date;
  },
): Promise<void> {
  const row = await prisma.userSocialAccount.findUnique({
    where: { userId_platform: { userId, platform } },
  });
  if (!row) return;
  await prisma.userSocialAccount.update({
    where: { id: row.id },
    data: {
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      profileUrl: data.profileUrl,
      followersPrev: row.followers,
      followers: data.followers,
      totalLikes: data.totalLikes,
      avgViewsPrev: row.avgViews,
      avgViews: data.avgViews,
      avgEngagement: data.avgEngagement,
      postingFreq: data.postingFreq ?? "",
      lastUploadAt: data.lastUploadAt,
      growthPercent: data.growthPercent,
      bestVideoJson: data.bestVideoJson ?? undefined,
      statsSource: data.statsSource,
      statsUpdatedAt: data.statsUpdatedAt,
    },
  });
}

export async function findLatestAiAnalysis(userId: string) {
  return prisma.userProfileAiAnalysis.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export function socialRowsFromOnboarding(
  profile: {
    instagramUsername: string;
    tiktokUsername: string;
    youtubeChannel: string;
  },
): SocialRow[] {
  const entries: { platform: SocialPlatform; username: string }[] = [
    { platform: "instagram", username: profile.instagramUsername.trim() },
    { platform: "tiktok", username: profile.tiktokUsername.trim() },
    { platform: "youtube", username: profile.youtubeChannel.trim() },
  ];

  return entries
    .filter((e) => e.username)
    .map((e) => ({
      id: `fallback-${e.platform}`,
      userId: "",
      platform: e.platform,
      username: e.username.replace(/^@/, ""),
      displayName: e.username.replace(/^@/, ""),
      avatarUrl: "",
      profileUrl: "",
      followers: null,
      followersPrev: null,
      totalLikes: null,
      avgViews: null,
      avgViewsPrev: null,
      avgEngagement: null,
      postingFreq: "",
      lastUploadAt: null,
      growthPercent: null,
      bestVideoJson: null,
      statsSource: "pending",
      statsUpdatedAt: null,
      authMethod: "manual",
      connectionStatus: "connected",
      connectionHealth: "degraded",
      externalAccountId: "",
      syncStatus: "idle",
      updateStrategy: "polling",
      lastSyncAt: null,
      lastSyncSuccessAt: null,
      lastSyncFailedAt: null,
      nextSyncAt: null,
      lastSyncError: "",
      manualRefreshAt: null,
    }));
}
