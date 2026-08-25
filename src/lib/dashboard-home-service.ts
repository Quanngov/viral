import "server-only";

import {
  DEFAULT_ACTIVITY_RING_GOALS,
  type DashboardActivityRing,
  type DashboardAiMonthlyTask,
  type DashboardHomePayload,
  type DashboardSocialSummary,
  type MetricTrend,
} from "@/lib/dashboard-home-types";
import type { SocialPlatform } from "@/lib/profile/profile-types";
import { ensureOnboardingProfile } from "@/lib/profile/onboarding-profile-store";
import { listSocialAccounts, socialRowsFromOnboarding, type SocialRow } from "@/lib/profile/profile-social-store";
import { prismaSequential } from "@/lib/prisma-sequential";
import { getSocialProvider } from "@/lib/social-sync/provider-registry";
import type { SocialAuthMethod, SocialConnectionStatus } from "@/lib/social-sync/social-sync.types";

const PLATFORMS: SocialPlatform[] = ["instagram", "tiktok", "youtube"];

function estimateMonthlyViews(avgViews: number | null | undefined): number | null {
  if (avgViews == null) return null;
  return Math.round(avgViews * 4.33);
}

function computeTrend(current: number | null, previous: number | null | undefined): MetricTrend {
  if (current == null || previous == null) return null;
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "flat";
}

function isRowConnected(row: SocialRow | undefined): boolean {
  if (!row) return false;
  return row.connectionStatus === "connected";
}

function buildSocialSummaries(
  rows: SocialRow[],
  profile: Awaited<ReturnType<typeof ensureOnboardingProfile>>,
): DashboardSocialSummary[] {
  const merged = rows.length > 0 ? rows : socialRowsFromOnboarding(profile);

  return PLATFORMS.map((platform) => {
    const row = merged.find((r) => r.platform === platform);
    const integration = getSocialProvider(platform);
    const username = row?.username?.trim() ?? "";
    const connected = isRowConnected(row);
    const monthlyViews = connected ? estimateMonthlyViews(row?.avgViews) : null;
    const monthlyViewsPrev = connected ? estimateMonthlyViews(row?.avgViewsPrev) : null;

    return {
      platform,
      connected,
      username,
      avatarUrl: row?.avatarUrl ?? "",
      followers: connected ? (row?.followers ?? null) : null,
      followersTrend: connected ? computeTrend(row?.followers ?? null, row?.followersPrev) : null,
      monthlyViews,
      monthlyViewsTrend: connected ? computeTrend(monthlyViews, monthlyViewsPrev) : null,
      connection: {
        method: (row?.authMethod as SocialAuthMethod | undefined) ?? null,
        status: (row?.connectionStatus as SocialConnectionStatus | undefined) ?? "disconnected",
        oauthAvailable: integration.capabilities.oauth,
        connectPath: `/api/social/oauth/${platform}/start`,
      },
    };
  });
}

function buildActivityRings(accounts: DashboardSocialSummary[]): DashboardActivityRing[] {
  const connected = accounts.filter((a) => a.connected);
  const totalFollowers = connected.reduce((s, a) => s + (a.followers ?? 0), 0);
  const totalMonthlyViews = connected.reduce((s, a) => s + (a.monthlyViews ?? 0), 0);

  return [
    {
      id: "videos",
      label: "Ролики опубликованы",
      current: 0,
      goal: DEFAULT_ACTIVITY_RING_GOALS.videos,
      color: "#e11d48",
    },
    {
      id: "views",
      label: "Просмотры получены",
      current: totalMonthlyViews,
      goal: DEFAULT_ACTIVITY_RING_GOALS.views,
      color: "#059669",
    },
    {
      id: "growth",
      label: "Рост подписчиков",
      current: 0,
      goal: DEFAULT_ACTIVITY_RING_GOALS.growth,
      color: "#0891b2",
    },
  ];
}

function buildMonthlyTasks(): DashboardAiMonthlyTask[] {
  return [
    {
      id: "task-videos",
      label: `Опубликовать ${DEFAULT_ACTIVITY_RING_GOALS.videos} роликов в этом месяце`,
      completed: false,
      source: "template",
    },
    {
      id: "task-hooks",
      label: "Протестировать 3 новых хука",
      completed: false,
      source: "template",
    },
    {
      id: "task-frequency",
      label: "Увеличить частоту публикаций",
      completed: false,
      source: "template",
    },
    {
      id: "task-formats",
      label: "Переснять 2 трендовых формата",
      completed: false,
      source: "template",
    },
  ];
}

/** Lightweight home overview — no profile hub sync or heavy recommendation queries. */
export async function buildDashboardHomePayload(userId: string): Promise<DashboardHomePayload> {
  const [profile, socialRows] = await prismaSequential(
    () => ensureOnboardingProfile(userId),
    () => listSocialAccounts(userId),
  );

  const socialAccounts = buildSocialSummaries(socialRows, profile);
  const totals = {
    followers: socialAccounts.reduce((s, a) => s + (a.followers ?? 0), 0),
    monthlyViews: socialAccounts.reduce((s, a) => s + (a.monthlyViews ?? 0), 0),
  };

  return {
    socialAccounts,
    totals,
    activityRings: buildActivityRings(socialAccounts),
    monthlyTasks: buildMonthlyTasks(),
  };
}
