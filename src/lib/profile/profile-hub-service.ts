import "server-only";

import { auth } from "@/auth";
import {
  BILLING_ACTION_COSTS,
  BILLING_PLANS,
  type BillingPlanId,
} from "@/lib/billing/billing.config";
import { loadBillingBundle } from "@/lib/billing/billing-service";
import {
  ensureOnboardingProfile,
  patchOnboardingProfile,
} from "@/lib/profile/onboarding-profile-store";
import { prisma } from "@/lib/prisma";
import { videoToClientJson } from "@/lib/serialize-video";
import {
  getProfilePlanFeatures,
} from "@/lib/profile/profile-plan-features";
import {
  deleteSocialAccountRow,
  findLatestAiAnalysis,
  listSocialAccounts,
  upsertSocialAccountRow,
} from "@/lib/profile/profile-social-store";
import { SocialSyncService } from "@/lib/social-sync/social-sync-service";
import { prismaSequential } from "@/lib/prisma-sequential";
import {
  AI_PROFILE_ANALYSIS_TOKEN_COST,
  AI_PROFILE_REPORT_SECTIONS,
  type ProfileHubPayload,
  type ProfileRecommendation,
  type ProfileRecommendationGroup,
  type ProfileSocialAccount,
  type ProfileTopVideo,
  type SocialPlatform,
} from "@/lib/profile/profile-types";

const PLATFORMS: SocialPlatform[] = ["instagram", "tiktok", "youtube"];

function platformUsername(
  platform: SocialPlatform,
  profile: { instagramUsername: string; tiktokUsername: string; youtubeChannel: string },
): string {
  if (platform === "instagram") return profile.instagramUsername.trim();
  if (platform === "tiktok") return profile.tiktokUsername.trim();
  return profile.youtubeChannel.trim();
}

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function serializeSocialRow(row: {
  platform: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
  followers: number | null;
  totalLikes: number | null;
  avgViews: number | null;
  avgEngagement: number | null;
  postingFreq: string;
  lastUploadAt: Date | null;
  growthPercent: number | null;
  bestVideoJson: unknown;
  statsSource: string;
  statsUpdatedAt: Date | null;
  authMethod?: string;
  connectionStatus?: string;
  connectionHealth?: string;
  syncStatus?: string;
  updateStrategy?: string;
  lastSyncAt?: Date | null;
  lastSyncSuccessAt?: Date | null;
  lastSyncFailedAt?: Date | null;
  nextSyncAt?: Date | null;
  lastSyncError?: string;
  manualRefreshAt?: Date | null;
}): ProfileSocialAccount {
  const best =
    row.bestVideoJson && typeof row.bestVideoJson === "object"
      ? (row.bestVideoJson as ProfileSocialAccount["bestVideo"])
      : null;

  const platform = row.platform as SocialPlatform;
  const connected = row.connectionStatus === "connected";

  return {
    platform,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    profileUrl: row.profileUrl,
    connected,
    statsSource: (row.statsSource as ProfileSocialAccount["statsSource"]) || "pending",
    statsUpdatedAt: toIso(row.statsUpdatedAt),
    followers: row.followers,
    totalLikes: row.totalLikes,
    avgViews: row.avgViews,
    avgEngagement: row.avgEngagement,
    postingFreq: row.postingFreq || null,
    lastUploadAt: toIso(row.lastUploadAt),
    growthPercent: row.growthPercent,
    bestVideo: best,
    sync: {
      authMethod: (row.authMethod as "manual" | "oauth") ?? null,
      connectionStatus: row.connectionStatus ?? "disconnected",
      connectionHealth: row.connectionHealth ?? "disconnected",
      syncStatus: row.syncStatus ?? "idle",
      updateStrategy: row.updateStrategy ?? "polling",
      lastSyncAt: toIso(row.lastSyncAt ?? null),
      lastSyncSuccessAt: toIso(row.lastSyncSuccessAt ?? null),
      nextSyncAt: toIso(row.nextSyncAt ?? null),
      lastSyncFailedAt: toIso(row.lastSyncFailedAt ?? null),
      lastSyncError: row.lastSyncError || null,
      manualRefreshAvailable: row.authMethod === "oauth",
      oauthConnectPath: `/api/social/oauth/${platform}/start`,
    },
  };
}

/** @deprecated Read path must not mutate social rows — use upsertSocialAccount on save only. */
async function syncSocialAccountsFromProfile(userId: string) {
  const profile = await ensureOnboardingProfile(userId);

  for (const platform of PLATFORMS) {
    const username = platformUsername(platform, profile);
    if (!username) continue;
    await upsertSocialAccountRow(userId, platform, username);
  }
}

export async function syncSocialAccountsFromOnboardingSave(userId: string): Promise<void> {
  await syncSocialAccountsFromProfile(userId);
}

export async function refreshUserSocialStats(userId: string): Promise<Date> {
  const rows = await listSocialAccounts(userId);
  const now = new Date();

  for (const row of rows) {
    if (row.connectionStatus !== "connected") continue;
    try {
      await SocialSyncService.enqueueSync(row.id, "manual", 30);
    } catch {
      /* queue dedupes active jobs */
    }
  }

  return now;
}

function toProfileVideo(
  v: ReturnType<typeof videoToClientJson>,
  source: ProfileTopVideo["source"],
): ProfileTopVideo {
  return {
    id: v.id,
    platform: v.platform,
    externalId: v.externalId,
    title: v.title,
    thumbnailUrl: v.thumbnailUrl,
    url: v.url,
    views: v.viewsCount ?? 0,
    likes: v.likesCount ?? 0,
    comments: v.comments ?? 0,
    engagementRate: v.engagementRate ?? null,
    publishedAt: v.publishedAtIso ?? null,
    source,
  };
}

type SavedRow = Awaited<ReturnType<typeof prisma.savedVideo.findMany>>[number];
type VideoRow = Awaited<ReturnType<typeof prisma.video.findMany>>[number];

// Recommendation pools are generic trending/popular lists (not per-request state).
// Cache them briefly to avoid 3 wide Video.findMany scans on every profile-hub load.
const REC_POOL_TTL_MS = 60_000;
const recPoolCache = new Map<
  string,
  { at: number; trendingPool: VideoRow[]; similarPool: VideoRow[]; recreatePool: VideoRow[] }
>();

async function getRecommendationPools(nicheTerms: string[]): Promise<{
  trendingPool: VideoRow[];
  similarPool: VideoRow[];
  recreatePool: VideoRow[];
}> {
  const key = nicheTerms.join("|").toLowerCase();
  const cached = recPoolCache.get(key);
  if (cached && Date.now() - cached.at < REC_POOL_TTL_MS) {
    return {
      trendingPool: cached.trendingPool,
      similarPool: cached.similarPool,
      recreatePool: cached.recreatePool,
    };
  }

  const [trendingPool, similarPool, recreatePool] = await prismaSequential(
    () =>
      prisma.video.findMany({
        where: nicheTerms.length
          ? {
              OR: nicheTerms.flatMap((term) => [
                { title: { contains: term, mode: "insensitive" as const } },
                { niche: { contains: term, mode: "insensitive" as const } },
              ]),
            }
          : undefined,
        orderBy: [{ viewsPerHour: "desc" }, { rating: "desc" }],
        take: 8,
      }),
    () =>
      prisma.video.findMany({
        where: nicheTerms.length
          ? {
              OR: nicheTerms.flatMap((term) => [
                { title: { contains: term, mode: "insensitive" as const } },
                { description: { contains: term, mode: "insensitive" as const } },
              ]),
            }
          : undefined,
        orderBy: [{ rating: "desc" }, { views: "desc" }],
        take: 8,
      }),
    () =>
      prisma.video.findMany({
        orderBy: [{ engagementRate: "desc" }, { rating: "desc" }],
        take: 8,
      }),
  );

  recPoolCache.set(key, { at: Date.now(), trendingPool, similarPool, recreatePool });
  if (recPoolCache.size > 64) {
    // Drop oldest entry to keep the cache bounded.
    const oldest = [...recPoolCache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) recPoolCache.delete(oldest[0]);
  }
  return { trendingPool, similarPool, recreatePool };
}

function buildRecommendationGroups(
  niches: string[],
  creatorType: string,
  saved: SavedRow[],
  pools: { trendingPool: VideoRow[]; similarPool: VideoRow[]; recreatePool: VideoRow[] },
): ProfileRecommendationGroup[] {
  const { trendingPool, similarPool, recreatePool } = pools;

  const makeItems = (
    pool: typeof trendingPool,
    group: ProfileRecommendationGroup["id"],
    reasons: [string, string, string],
  ): ProfileRecommendation[] =>
    pool.slice(0, 4).map((v, i) => {
      const card = videoToClientJson(v);
      const reason = reasons[i % reasons.length];
      return {
        video: toProfileVideo(card, saved.some((s) => s.externalId === v.externalId) ? "saved" : "recommended"),
        reason,
        tag: reason,
        group,
      };
    });

  return [
    {
      id: "trending",
      title: "В тренде в вашей нише",
      emptyHint: "Укажите нишу в настройках — покажем актуальные тренды.",
      items: makeItems(trendingPool, "trending", [
        "Сейчас набирает популярность в вашей нише",
        "Высокая скорость роста просмотров",
        "Актуальная тема для вашей аудитории",
      ]),
    },
    {
      id: "similar",
      title: "Похоже на ваш контент",
      emptyHint: "Сохраните ролики или подключите соцсети — найдём похожие форматы.",
      items: makeItems(similarPool, "similar", [
        "Похоже на ваш формат",
        "Совпадает со стилем сохранённых роликов",
        "Подходит под ваш тип контента",
      ]),
    },
    {
      id: "recreate",
      title: "Стоит переснять",
      emptyHint: "Подключите Instagram, чтобы получать идеи под ваш аккаунт.",
      items: makeItems(recreatePool, "recreate", [
        "Высокий потенциал для адаптации",
        "Конкуренты начали использовать этот формат",
        "Сильная вовлечённость — легко адаптировать",
      ]),
    },
  ];
}

function buildTopVideos(saved: SavedRow[]): ProfileTopVideo[] {
  const top = [...saved]
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0) || (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 8);

  return top.map((s) => ({
    id: `${s.platform}:${s.externalId}`,
    platform: s.platform,
    externalId: s.externalId,
    title: s.title,
    thumbnailUrl: s.thumbnailUrl ?? "",
    url: s.url,
    views: s.views ?? 0,
    likes: s.likes ?? 0,
    comments: s.comments ?? 0,
    engagementRate:
      s.views && s.likes != null ? Math.round((s.likes / Math.max(s.views, 1)) * 10000) / 100 : null,
    publishedAt: s.publishedAt?.toISOString() ?? null,
    source: "saved" as const,
  }));
}

function buildSocialAccountsList(
  socialRows: Awaited<ReturnType<typeof listSocialAccounts>>,
  _profile: { instagramUsername: string; tiktokUsername: string; youtubeChannel: string },
): ProfileSocialAccount[] {
  return PLATFORMS.map((platform) => {
    const row = socialRows.find((r) => r.platform === platform);
    if (row) return serializeSocialRow(row);
    return {
      platform,
      username: "",
      displayName: "",
      avatarUrl: "",
      profileUrl: "",
      connected: false,
      statsSource: "pending" as const,
      statsUpdatedAt: null,
      followers: null,
      totalLikes: null,
      avgViews: null,
      avgEngagement: null,
      postingFreq: null,
      lastUploadAt: null,
      growthPercent: null,
      bestVideo: null,
      sync: {
        authMethod: null,
        connectionStatus: "disconnected",
        connectionHealth: "disconnected",
        syncStatus: "idle",
        updateStrategy: "polling",
        lastSyncAt: null,
        lastSyncSuccessAt: null,
        nextSyncAt: null,
        lastSyncFailedAt: null,
        lastSyncError: null,
        manualRefreshAvailable: false,
        oauthConnectPath: `/api/social/oauth/${platform}/start`,
      },
    };
  });
}

export async function buildProfileHubPayload(
  userId: string,
  opts?: { justRefreshed?: boolean; forceRefresh?: boolean },
): Promise<ProfileHubPayload> {
  const [{ subscription, wallet }, profile, socialRows, lastAnalysis] = await prismaSequential(
    () => loadBillingBundle(userId),
    () => ensureOnboardingProfile(userId),
    () => listSocialAccounts(userId),
    () => findLatestAiAnalysis(userId),
  );

  const planId = (subscription.plan as BillingPlanId) || "FREE";
  const planCfg = BILLING_PLANS[planId] ?? BILLING_PLANS.FREE;
  const planFeatures = getProfilePlanFeatures(planId);

  const lastRefreshed = socialRows.reduce<Date | null>((acc, r) => {
    const d = r.lastSyncSuccessAt ?? r.statsUpdatedAt;
    if (!d) return acc;
    if (!acc || d > acc) return d;
    return acc;
  }, null);

  const refreshedAt = lastRefreshed;
  const socialAccountsAfter = socialRows;

  const authSession = await auth();
  const email = authSession?.user?.email ?? "";
  const name = authSession?.user?.name ?? (email ? email.split("@")[0] : "Пользователь");
  const avatarUrl = authSession?.user?.image ?? null;

  const balance = wallet.balance;
  const searchCost = BILLING_ACTION_COSTS.SEARCH;
  const scriptCost = BILLING_ACTION_COSTS.SCRIPT;

  // Fetch saved videos once and derive both top videos and recommendation "saved" marks.
  const nicheTerms = [...profile.contentNiches, profile.creatorType].filter(Boolean).slice(0, 4);
  const [saved, pools] = await prismaSequential(
    () =>
      prisma.savedVideo.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    () => getRecommendationPools(nicheTerms),
  );

  const topVideos = buildTopVideos(saved);
  const recommendationGroups = buildRecommendationGroups(
    profile.contentNiches,
    profile.creatorType,
    saved,
    pools,
  );

  const aiCost = AI_PROFILE_ANALYSIS_TOKEN_COST;

  return {
    overview: {
      name,
      email,
      avatarUrl,
      planId,
      planName: planCfg.name,
      planStatus: subscription.status,
      renewsAt: subscription.renewsAt,
      tokenBalance: balance,
      searchesRemaining: searchCost > 0 ? Math.floor(balance / searchCost) : 0,
      aiGenerationsRemaining: scriptCost > 0 ? Math.floor(balance / scriptCost) : 0,
      totalSpent: wallet.totalSpent,
    },
    settings: {
      creatorType: profile.creatorType,
      contentNiches: profile.contentNiches,
      instagramUsername: profile.instagramUsername,
      tiktokUsername: profile.tiktokUsername,
      youtubeChannel: profile.youtubeChannel,
    },
    socialAccounts: buildSocialAccountsList(socialAccountsAfter, profile),
    analytics: {
      lastRefreshedAt: toIso(refreshedAt),
      justRefreshed: Boolean(opts?.justRefreshed),
      autoRefreshEnabled: planFeatures.autoRefreshHours !== null,
      autoRefreshHours: planFeatures.autoRefreshHours,
      needsUpgradeForAutoRefresh: planFeatures.autoRefreshHours === null,
      planFeatures,
    },
    topVideos,
    recommendationGroups,
    subscription: {
      planId,
      planName: planCfg.name,
      status: subscription.status,
      features: planCfg.features,
      tokensPerPeriod: planCfg.tokensPerPeriod || planCfg.initialGrantTokens,
      renewsAt: subscription.renewsAt,
      trialEndsAt: subscription.trialEndsAt,
      maxCompetitors: subscription.maxCompetitors,
      tokenBalance: balance,
      totalSpent: wallet.totalSpent,
      actionCosts: { ...BILLING_ACTION_COSTS },
    },
    aiAnalysis: {
      tokenCost: aiCost,
      available: planFeatures.aiProfileAnalysis,
      insufficientTokens: balance < aiCost,
      lastAnalysisAt: toIso(lastAnalysis?.completedAt ?? lastAnalysis?.createdAt ?? null),
      status:
        lastAnalysis?.status === "completed"
          ? "completed"
          : lastAnalysis?.status === "pending"
            ? "pending"
            : lastAnalysis?.status === "failed"
              ? "failed"
              : "idle",
      reportSections: [...AI_PROFILE_REPORT_SECTIONS],
    },
  };
}

export async function upsertSocialAccount(
  userId: string,
  platform: SocialPlatform,
  username: string,
): Promise<void> {
  const handle = username.replace(/^@/, "").trim().slice(0, 120);

  const patch =
    platform === "instagram"
      ? { instagramUsername: handle }
      : platform === "tiktok"
        ? { tiktokUsername: handle }
        : { youtubeChannel: handle };

  await patchOnboardingProfile(userId, patch);

  if (!handle) {
    await deleteSocialAccountRow(userId, platform);
    return;
  }

  await upsertSocialAccountRow(userId, platform, handle);
}

export async function removeSocialAccount(userId: string, platform: SocialPlatform): Promise<void> {
  const patch =
    platform === "instagram"
      ? { instagramUsername: "" }
      : platform === "tiktok"
        ? { tiktokUsername: "" }
        : { youtubeChannel: "" };

  await patchOnboardingProfile(userId, patch);
  await SocialSyncService.disconnect(userId, platform);
  await deleteSocialAccountRow(userId, platform);
}
