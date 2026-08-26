import {
  BILLING_PLANS,
  TOKEN_PACKS,
  type BillingPlanId,
  type TokenPackId,
} from "@/lib/billing/billing.config";

/** Единый источник промо-логики: офферы строятся из существующего billing.config. */

export const PROMO_DISCOUNT_PCT = 30;
export const PROMO_OFFER_DURATION_MS = 60 * 60 * 1000; // 1 час

/** Следующий тариф для upgrade-оффера (BUSINESS — выше нет). */
export function getNextPlanId(planId: BillingPlanId): BillingPlanId | null {
  switch (planId) {
    case "FREE":
    case "TRIAL":
      return "PRO";
    case "PRO":
      return "BUSINESS";
    default:
      return null;
  }
}

export type UpgradeOffer = {
  kind: "upgrade";
  nextPlanId: BillingPlanId;
  nextPlanName: string;
  priceRub: number;
  discountedRub: number;
  savingsRub: number;
  discountPct: number;
};

/** Английское отображаемое имя тарифа (нормализация для промо-UI). */
const PLAN_DISPLAY_NAMES: Record<string, string> = {
  FREE: "FREE",
  TRIAL: "TRIAL",
  PRO: "PRO",
  BUSINESS: "BUSINESS",
};

export function planDisplayName(planId: BillingPlanId): string {
  return PLAN_DISPLAY_NAMES[planId] ?? planId.toUpperCase();
}

/** Оффер апгрейда: цена со скидкой считается из существующей цены тарифа. */
export function computeUpgradeOffer(planId: BillingPlanId): UpgradeOffer | null {
  const nextPlanId = getNextPlanId(planId);
  if (!nextPlanId) return null;
  const priceRub = BILLING_PLANS[nextPlanId].priceMonthlyRub;
  const discountedRub = Math.round((priceRub * (100 - PROMO_DISCOUNT_PCT)) / 100);
  return {
    kind: "upgrade",
    nextPlanId,
    nextPlanName: planDisplayName(nextPlanId),
    priceRub,
    discountedRub,
    savingsRub: priceRub - discountedRub,
    discountPct: PROMO_DISCOUNT_PCT,
  };
}

export type TokenPackOffer = {
  kind: "tokens";
  packId: TokenPackId;
  packName: string;
  tokens: number;
  priceRub: number;
};

/** Оффер пакета токенов из существующей конфигурации. */
export function computeTokenPackOffer(packId: TokenPackId): TokenPackOffer {
  const p = TOKEN_PACKS[packId];
  return { kind: "tokens", packId, packName: p.name, tokens: p.tokens, priceRub: p.priceRub };
}

export type PromoVariant = "upgrade" | "tokens" | "registration";

/**
 * Детерминированный выбор варианта на день (стабилен между рендерами
 * и перезагрузками). Если апгрейд недоступен (BUSINESS) — всегда токены.
 */
export function pickPromoVariant(planId: BillingPlanId, dateKey: string): PromoVariant {
  if (getNextPlanId(planId) === null) return "tokens";
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return hash % 2 === 0 ? "upgrade" : "tokens";
}

// ---- Хранение состояния показа (клиент). ----
// Сессионная cookie httpOnly недоступна в JS, поэтому храним в localStorage.
// Ключ версионирован и привязан к пользователю (email), чтобы старые тестовые
// значения или другой пользователь/гость не блокировали показ.

const STORAGE_VERSION = 2;

/** Стабильный ключ области хранения для конкретного пользователя. */
export function userScope(email: string): string {
  if (!email) return "anon";
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  }
  return `u${hash.toString(36)}`;
}

function promoStorageKey(scope: string): string {
  return `viral:promo:v${STORAGE_VERSION}:${scope}`;
}

export type PromoDailyState = {
  /** YYYY-MM-DD */
  date: string;
  /** Хедер уже показан/закрыт сегодня — не показывать повторно. */
  headerShown: boolean;
  /** ISO окончания действия оффера. */
  expiresAt: string | null;
  variant: PromoVariant;
};

export function todayKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function readPromoDaily(scope: string): PromoDailyState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(promoStorageKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PromoDailyState;
    if (!parsed || typeof parsed.date !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePromoDaily(scope: string, state: PromoDailyState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(promoStorageKey(scope), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
