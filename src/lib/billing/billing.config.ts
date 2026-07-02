/**
 * Единый источник правды: тарифы, пакеты, стоимость действий.
 * Не дублировать цифры в других файлах — импортировать отсюда.
 */

export const BILLING_PLAN_IDS = ["FREE", "TRIAL", "PRO", "BUSINESS"] as const;
export type BillingPlanId = (typeof BILLING_PLAN_IDS)[number];

export const BILLING_INTERVALS = ["MONTHLY", "YEARLY"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const TOKEN_PACK_IDS = ["SMALL", "MEDIUM", "LARGE"] as const;
export type TokenPackId = (typeof TOKEN_PACK_IDS)[number];

export const TOKEN_LEDGER_TYPES = [
  "SUBSCRIPTION_GRANT",
  "TRIAL_GRANT",
  "FREE_GRANT",
  "TOKEN_PACK",
  "SPEND",
  "REFUND",
  "ADMIN_ADJUSTMENT",
] as const;
export type TokenLedgerType = (typeof TOKEN_LEDGER_TYPES)[number];

export const BILLING_ACTION_KEYS = [
  "SEARCH",
  "LOAD_MORE",
  "SCRIPT",
  "TRANSCRIBE",
  "ADD_COMPETITOR",
  "REFRESH_COMPETITOR",
  "DAILY_SYNC",
] as const;
export type BillingActionKey = (typeof BILLING_ACTION_KEYS)[number];

/** Стоимость действий (внутренние токены). */
export const BILLING_ACTION_COSTS: Record<BillingActionKey, number> = {
  SEARCH: 5,
  LOAD_MORE: 5,
  SCRIPT: 25,
  TRANSCRIBE: 10,
  ADD_COMPETITOR: 35,
  REFRESH_COMPETITOR: 35,
  DAILY_SYNC: 5,
} as const;

export function getActionTokenCost(action: BillingActionKey): number {
  return BILLING_ACTION_COSTS[action];
}

export type BillingPlanConfig = {
  id: BillingPlanId;
  name: string;
  priceMonthlyRub: number;
  priceYearlyRub: number;
  tokensPerPeriod: number;
  maxCompetitors: number;
  /** Разовое начисление (FREE) или при активации (TRIAL). */
  initialGrantTokens: number;
  trialDays: number | null;
  features: string[];
};

export const BILLING_PLANS: Record<BillingPlanId, BillingPlanConfig> = {
  FREE: {
    id: "FREE",
    name: "Бесплатный",
    priceMonthlyRub: 0,
    priceYearlyRub: 0,
    tokensPerPeriod: 0,
    maxCompetitors: 0,
    initialGrantTokens: 60,
    trialDays: null,
    features: [
      "Лента из кэша",
      "60 токенов один раз",
      "Без конкурентов",
    ],
  },
  TRIAL: {
    id: "TRIAL",
    name: "Пробный",
    priceMonthlyRub: 0,
    priceYearlyRub: 0,
    tokensPerPeriod: 0,
    maxCompetitors: 1,
    initialGrantTokens: 200,
    trialDays: 3,
    features: [
      "200 токенов на 3 дня",
      "1 конкурент",
      "Полный доступ к функциям Pro",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Про",
    priceMonthlyRub: 2490,
    priceYearlyRub: 24900,
    tokensPerPeriod: 3000,
    maxCompetitors: 30,
    initialGrantTokens: 0,
    trialDays: null,
    features: [
      "3 000 токенов / месяц",
      "30 конкурентов",
      "Поиск, сценарии, транскрибация",
    ],
  },
  BUSINESS: {
    id: "BUSINESS",
    name: "Бизнес",
    priceMonthlyRub: 11900,
    priceYearlyRub: 119000,
    tokensPerPeriod: 18000,
    maxCompetitors: 100,
    initialGrantTokens: 0,
    trialDays: null,
    features: [
      "18 000 токенов / месяц",
      "100 конкурентов",
      "Для команд и агентств",
    ],
  },
};

export type TokenPackConfig = {
  id: TokenPackId;
  name: string;
  priceRub: number;
  tokens: number;
};

export const TOKEN_PACKS: Record<TokenPackId, TokenPackConfig> = {
  SMALL: { id: "SMALL", name: "Small", priceRub: 490, tokens: 500 },
  MEDIUM: { id: "MEDIUM", name: "Medium", priceRub: 1490, tokens: 2000 },
  LARGE: { id: "LARGE", name: "Large", priceRub: 2990, tokens: 5000 },
};

export function getPlanConfig(planId: BillingPlanId): BillingPlanConfig {
  return BILLING_PLANS[planId];
}

export function getMaxCompetitorsForPlan(planId: BillingPlanId): number {
  return BILLING_PLANS[planId].maxCompetitors;
}

export function getSubscriptionGrantTokens(planId: BillingPlanId): number {
  const plan = BILLING_PLANS[planId];
  if (planId === "FREE" || planId === "TRIAL") {
    return plan.initialGrantTokens;
  }
  return plan.tokensPerPeriod;
}

/** Публичный снимок для UI (без серверных деталей). */
export function getPublicBillingConfig() {
  return {
    plans: BILLING_PLAN_IDS.map((id) => {
      const p = BILLING_PLANS[id];
      return {
        id: p.id,
        name: p.name,
        priceMonthlyRub: p.priceMonthlyRub,
        priceYearlyRub: p.priceYearlyRub,
        tokensPerPeriod: p.tokensPerPeriod,
        initialGrantTokens: p.initialGrantTokens,
        maxCompetitors: p.maxCompetitors,
        trialDays: p.trialDays,
        features: p.features,
      };
    }),
    tokenPacks: TOKEN_PACK_IDS.map((id) => {
      const p = TOKEN_PACKS[id];
      return { id: p.id, name: p.name, priceRub: p.priceRub, tokens: p.tokens };
    }),
    actionCosts: { ...BILLING_ACTION_COSTS },
  };
}
