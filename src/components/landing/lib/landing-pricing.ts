import {
  BILLING_ACTION_COSTS,
  BILLING_PLANS,
  type BillingPlanId,
} from "@/lib/billing/billing.config";

export type LandingPricingPlanId = BillingPlanId;

export type LandingPlanLimits = {
  tokens: number;
  competitors: number;
  searches: number;
  loadMore: number;
  scripts: number;
  transcriptions: number;
  addCompetitor: number;
  refreshCompetitor: number;
  teamSeats: number;
};

export type LandingComparisonRow = {
  key: keyof LandingPlanLimits;
  label: string;
  hint?: string;
};

/** Явные лимиты «Бизнес» + производные для остальных тарифов по той же схеме. */
const BUSINESS_LIMITS: LandingPlanLimits = {
  tokens: 18_000,
  competitors: 100,
  searches: 3_600,
  loadMore: 3_600,
  scripts: 720,
  transcriptions: 1_800,
  addCompetitor: 514,
  refreshCompetitor: 514,
  teamSeats: 36,
};

function tokenPool(planId: LandingPricingPlanId): number {
  const plan = BILLING_PLANS[planId];
  if (planId === "FREE" || planId === "TRIAL") {
    return plan.initialGrantTokens;
  }
  return plan.tokensPerPeriod;
}

function equivalentLimit(tokens: number, cost: number): number {
  if (tokens <= 0 || cost <= 0) return 0;
  return Math.floor(tokens / cost);
}

function deriveTeamSeats(planId: LandingPricingPlanId): number {
  if (planId === "BUSINESS") return BUSINESS_LIMITS.teamSeats;
  if (planId === "PRO") return 6;
  return 1;
}

export function getLandingPlanLimits(planId: LandingPricingPlanId): LandingPlanLimits {
  if (planId === "BUSINESS") {
    return { ...BUSINESS_LIMITS };
  }

  const tokens = tokenPool(planId);
  const { maxCompetitors } = BILLING_PLANS[planId];

  return {
    tokens,
    competitors: maxCompetitors,
    searches: equivalentLimit(tokens, BILLING_ACTION_COSTS.SEARCH),
    loadMore: equivalentLimit(tokens, BILLING_ACTION_COSTS.LOAD_MORE),
    scripts: equivalentLimit(tokens, BILLING_ACTION_COSTS.SCRIPT),
    transcriptions: equivalentLimit(tokens, BILLING_ACTION_COSTS.TRANSCRIBE),
    addCompetitor: equivalentLimit(tokens, BILLING_ACTION_COSTS.ADD_COMPETITOR),
    refreshCompetitor: equivalentLimit(tokens, BILLING_ACTION_COSTS.REFRESH_COMPETITOR),
    teamSeats: deriveTeamSeats(planId),
  };
}

export const LANDING_PAID_PLANS: Array<"PRO" | "BUSINESS"> = ["PRO", "BUSINESS"];

export const LANDING_COMPARISON_PLANS: LandingPricingPlanId[] = [
  "FREE",
  "TRIAL",
  "PRO",
  "BUSINESS",
];

export const LANDING_COMPARISON_ROWS: LandingComparisonRow[] = [
  { key: "tokens", label: "Токены" },
  { key: "competitors", label: "Конкуренты в шпионе" },
  {
    key: "searches",
    label: "Поисков в месяц",
    hint: "при полной трате пула на поиск",
  },
  {
    key: "loadMore",
    label: "Загрузок «Ещё ролики»",
    hint: "при полной трате пула",
  },
  {
    key: "scripts",
    label: "Сценариев в месяц",
    hint: "при полной трате пула",
  },
  {
    key: "transcriptions",
    label: "Транскрибаций в месяц",
    hint: "при полной трате пула",
  },
  {
    key: "addCompetitor",
    label: "Добавлений конкурентов",
    hint: "при полной трате пула",
  },
  {
    key: "refreshCompetitor",
    label: "Обновлений Reels",
    hint: "при полной трате пула",
  },
  { key: "teamSeats", label: "Мест в команде" },
];

export function formatLandingPrice(rub: number): string {
  return `${rub.toLocaleString("ru-RU")} ₽`;
}

export function formatLandingLimit(value: number): string {
  return value.toLocaleString("ru-RU");
}
