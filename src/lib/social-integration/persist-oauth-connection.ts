import "server-only";

import { prisma } from "@/lib/prisma";
import type { SocialPlatform } from "@/lib/profile/profile-types";
import type { SocialProfileSnapshot } from "./social-integration.types";

type OAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
  providerUserId?: string;
};

/**
 * Persist OAuth connection + profile snapshot after successful provider callback.
 * Called from /api/social/oauth/[platform]/callback when providers are wired.
 */
export async function persistOAuthSocialConnection(
  userId: string,
  platform: SocialPlatform,
  snapshot: SocialProfileSnapshot,
  tokens: OAuthTokens,
): Promise<void> {
  const existing = await prisma.userSocialAccount.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  const row = await prisma.userSocialAccount.upsert({
    where: { userId_platform: { userId, platform } },
    create: {
      userId,
      platform,
      username: snapshot.username,
      displayName: snapshot.displayName,
      avatarUrl: snapshot.avatarUrl,
      profileUrl: snapshot.profileUrl,
      externalAccountId: snapshot.externalAccountId,
      followers: snapshot.followers,
      totalLikes: snapshot.totalLikes,
      avgViews: snapshot.avgViews,
      avgEngagement: snapshot.avgEngagement,
      postingFreq: snapshot.postingFreq ?? "",
      lastUploadAt: snapshot.lastUploadAt,
      growthPercent: snapshot.growthPercent,
      statsSource: "oauth",
      statsUpdatedAt: new Date(),
      authMethod: "oauth",
      connectionStatus: "connected",
    },
    update: {
      username: snapshot.username,
      displayName: snapshot.displayName,
      avatarUrl: snapshot.avatarUrl,
      profileUrl: snapshot.profileUrl,
      externalAccountId: snapshot.externalAccountId,
      followersPrev: existing?.followers ?? null,
      followers: snapshot.followers,
      totalLikes: snapshot.totalLikes,
      avgViewsPrev: existing?.avgViews ?? null,
      avgViews: snapshot.avgViews,
      avgEngagement: snapshot.avgEngagement,
      postingFreq: snapshot.postingFreq ?? "",
      lastUploadAt: snapshot.lastUploadAt,
      growthPercent: snapshot.growthPercent,
      statsSource: "oauth",
      statsUpdatedAt: new Date(),
      authMethod: "oauth",
      connectionStatus: "connected",
    },
  });

  await prisma.userSocialOAuthCredential.upsert({
    where: { socialAccountId: row.id },
    create: {
      socialAccountId: row.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? "",
      tokenExpiresAt: tokens.expiresAt ?? null,
      scopes: tokens.scopes ?? [],
      providerUserId: tokens.providerUserId ?? snapshot.externalAccountId,
    },
    update: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? "",
      tokenExpiresAt: tokens.expiresAt ?? null,
      scopes: tokens.scopes ?? [],
      providerUserId: tokens.providerUserId ?? snapshot.externalAccountId,
    },
  });
}
