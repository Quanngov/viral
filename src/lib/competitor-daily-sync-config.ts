import {
  getActionTokenCost,
  getMaxCompetitorsForPlan,
  type BillingPlanId,
} from "@/lib/billing/billing.config";
import { getMaxCompetitorsForUser } from "@/lib/billing/billing-service";

export { getActionTokenCost };

/** @deprecated Используйте getMaxCompetitorsForUser(userId) на сервере. */
export const MAX_COMPETITORS_PER_USER = 100;

export async function resolveMaxCompetitorsForUser(userId: string): Promise<number> {
  return getMaxCompetitorsForUser(userId);
}

export function getMaxCompetitorsForPlanId(planId: BillingPlanId): number {
  return getMaxCompetitorsForPlan(planId);
}

export const COMPETITOR_DAILY_SYNC_TOKEN_COST = getActionTokenCost("DAILY_SYNC");

/** Сколько профилей обновлять внешним API за один вызов action=initial. */
export const DAILY_SYNC_INITIAL_PROFILE_CAP = 3;

/** Сколько профилей за один вызов action=more (2–3). */
export const DAILY_SYNC_MORE_PROFILE_CAP = 3;

/** Сколько последних роликов из БД учитывать при выборе приоритетных профилей (initial). */
export const DAILY_SYNC_DEFAULT_VISIBLE_VIDEO_LIMIT = 16;
