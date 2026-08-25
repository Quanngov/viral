import type { BillingPlanId } from "@/lib/billing/billing.config";
import type { ProfilePlanFeatures } from "@/lib/profile/profile-types";

export const PROFILE_PLAN_FEATURES: Record<BillingPlanId, ProfilePlanFeatures> = {
  FREE: {
    autoRefreshHours: null,
    historicalAnalytics: false,
    growthCharts: false,
    advancedEngagement: false,
    competitiveBenchmarks: false,
    aiProfileAnalysis: false,
  },
  TRIAL: {
    autoRefreshHours: 6,
    historicalAnalytics: false,
    growthCharts: false,
    advancedEngagement: true,
    competitiveBenchmarks: false,
    aiProfileAnalysis: true,
  },
  PRO: {
    autoRefreshHours: 6,
    historicalAnalytics: false,
    growthCharts: false,
    advancedEngagement: true,
    competitiveBenchmarks: false,
    aiProfileAnalysis: true,
  },
  BUSINESS: {
    autoRefreshHours: 2,
    historicalAnalytics: true,
    growthCharts: true,
    advancedEngagement: true,
    competitiveBenchmarks: true,
    aiProfileAnalysis: true,
  },
};

export function getProfilePlanFeatures(planId: BillingPlanId): ProfilePlanFeatures {
  return PROFILE_PLAN_FEATURES[planId] ?? PROFILE_PLAN_FEATURES.FREE;
}

export function canAutoRefreshProfile(planId: BillingPlanId): boolean {
  return getProfilePlanFeatures(planId).autoRefreshHours !== null;
}

export function shouldAutoRefreshProfile(
  planId: BillingPlanId,
  lastRefreshedAt: Date | null,
  now = new Date(),
): boolean {
  const hours = getProfilePlanFeatures(planId).autoRefreshHours;
  if (!hours || !lastRefreshedAt) return hours !== null;
  const elapsedMs = now.getTime() - lastRefreshedAt.getTime();
  return elapsedMs >= hours * 60 * 60 * 1000;
}
