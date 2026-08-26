"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useBilling } from "@/components/dashboard/BillingContext";
import { useAuthDisplay } from "@/hooks/use-auth-display";
import { BILLING_PLANS } from "@/lib/billing/billing.config";
import {
  computeUpgradeOffer,
  pickPromoVariant,
  PROMO_OFFER_DURATION_MS,
  readPromoDaily,
  todayKey,
  userScope,
  writePromoDaily,
  type PromoDailyState,
  type PromoVariant,
} from "@/lib/billing/promo";

function openAccount(tab: "plans" | "tokens") {
  window.dispatchEvent(new CustomEvent("viral:open-account", { detail: { tab, billingOnly: true } }));
}

export function getOfferRemainingMs(expiresAt: string): number {
  return Math.max(0, new Date(expiresAt).getTime() - Date.now());
}

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export type HeaderOfferInfo = {
  title: string;
  nextPlanName: string;
  priceRub: number;
  discountedRub: number;
  savingsRub: number;
  discountPct: number;
  tokensPerPeriod: number;
  maxCompetitors: number;
  expiresAt: string;
};

type PromoContextValue = {
  showHeader: boolean;
  headerOffer: HeaderOfferInfo | null;
  isGuest: boolean;
  showCard: boolean;
  cardVariant: PromoVariant;
  closeDialogOpen: boolean;
  openCloseDialog: () => void;
  closeDialogCancel: () => void;
  keepOffer: () => void;
  upgradeFromDialog: () => void;
  dismissHeader: () => void;
  goUpgrade: () => void;
  goBuyTokens: () => void;
};

const Ctx = createContext<PromoContextValue | null>(null);

export function PromoProvider({ children }: { children: ReactNode }) {
  const billing = useBilling();
  const { displayEmail, sessionLoading, showGuest } = useAuthDisplay();
  // Незарегистрированный пользователь получает регистрационный оффер вместо рекламного.
  const isGuest = showGuest;
  // Область хранения привязана к конкретному пользователю, чтобы гость/другой
  // аккаунт или старые тестовые значения не блокировали показ оффера.
  const scope = useMemo(() => userScope(displayEmail), [displayEmail]);
  const [state, setState] = useState<PromoDailyState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [decision, setDecision] = useState<{ show: boolean } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [mountNow] = useState(() => Date.now());

  // При смене состояния авторизации или пользователя сбрасываем dismiss/dialog/decision,
  // чтобы оффер пересчитался для текущего состояния и не смешивались регистрационный
  // и рекламный варианты (например, гость закрыл хедер и затем зарегистрировался).
  const prevIsGuest = useRef(isGuest);
  const prevScope = useRef(scope);
  useEffect(() => {
    const gPrev = prevIsGuest.current;
    prevIsGuest.current = isGuest;
    const sPrev = prevScope.current;
    prevScope.current = scope;
    if (gPrev !== isGuest || sPrev !== scope) {
      setDismissed(false);
      setCloseDialogOpen(false);
      setDecision(null);
    }
  }, [isGuest, scope]);

  // Инициализация/восстановление ежедневного состояния оффера.
  // Ждём завершения сессии (нужна для isGuest/scope). Для гостей биллинг не нужен —
  // регистрационный оффер не зависит от тарифа; для авторизованных ждём реальный тариф.
  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(() => {
      const saved = readPromoDaily(scope);
      const today = todayKey();
      if (saved && saved.date === today) {
        // Если сегодняшний оффер уже истёк (например, после перезагрузки прошло >1ч
        // или осталось старое тестовое состояние) — начинаем новый период показа карточки.
        // "Раз в день" для хедера сохраняем (headerShown не сбрасываем).
        const expired = !saved.expiresAt || new Date(saved.expiresAt).getTime() <= Date.now();
        if (expired && !isGuest) {
          const next: PromoDailyState = {
            date: today,
            headerShown: saved.headerShown,
            expiresAt: new Date(Date.now() + PROMO_OFFER_DURATION_MS).toISOString(),
            variant: pickPromoVariant(billing.planId, today),
          };
          writePromoDaily(scope, next);
          if (alive) setState(next);
        } else {
          if (alive) setState(saved);
        }
      } else {
        if (sessionLoading) return; // ждём сессию (scope/isGuest стабильны)
        if (!isGuest && billing.loading) return; // авторизованным ждём тариф
        const next: PromoDailyState = {
          date: today,
          headerShown: false,
          expiresAt: new Date(Date.now() + PROMO_OFFER_DURATION_MS).toISOString(),
          variant: isGuest ? "registration" : pickPromoVariant(billing.planId, today),
        };
        writePromoDaily(scope, next);
        if (alive) setState(next);
      }
      if (alive) setHydrated(true);
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [scope, billing.planId, billing.loading, sessionLoading, isGuest]);

  // Решение по хедеру: показывать сегодня или нет (один раз за сессию).
  useEffect(() => {
    if (isGuest) return; // регистрационный хедер не использует daily-логику показа
    if (!hydrated || billing.loading || decision || !state) return;
    const canShow = billing.planId !== "BUSINESS" && state?.headerShown === false;
    const raf = window.requestAnimationFrame(() => {
      if (canShow && state) {
        const next: PromoDailyState = { ...state, headerShown: true };
        writePromoDaily(scope, next);
        setState(next);
      }
      setDecision({ show: canShow });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [hydrated, billing.loading, billing.planId, state, decision, scope, isGuest]);

  const expiryMs = state?.expiresAt ? new Date(state.expiresAt).getTime() : 0;
  const offerActive = hydrated && expiryMs > mountNow;
  const showHeader = isGuest ? hydrated && !dismissed : decision?.show === true && !dismissed && offerActive;

  const headerOffer = useMemo<HeaderOfferInfo | null>(() => {
    const upgradeOffer = computeUpgradeOffer(billing.planId);
    if (!upgradeOffer) return null;
    const plan = BILLING_PLANS[upgradeOffer.nextPlanId];
    return {
      title: `−${upgradeOffer.discountPct}% НА ${upgradeOffer.nextPlanName}`,
      nextPlanName: upgradeOffer.nextPlanName,
      priceRub: upgradeOffer.priceRub,
      discountedRub: upgradeOffer.discountedRub,
      savingsRub: upgradeOffer.savingsRub,
      discountPct: upgradeOffer.discountPct,
      tokensPerPeriod: plan.tokensPerPeriod,
      maxCompetitors: plan.maxCompetitors,
      expiresAt: state?.expiresAt ?? "",
    };
  }, [billing.planId, state?.expiresAt]);

  const cardVariant: PromoVariant = isGuest ? "registration" : (state?.variant ?? "tokens");
  const showCard = isGuest ? hydrated : offerActive;

  const openCloseDialog = useCallback(() => setCloseDialogOpen(true), []);
  const closeDialogCancel = useCallback(() => setCloseDialogOpen(false), []);
  const keepOffer = useCallback(() => {
    setDismissed(true);
    setCloseDialogOpen(false);
  }, []);
  const dismissHeader = useCallback(() => setDismissed(true), []);
  const upgradeFromDialog = useCallback(() => {
    openAccount("plans");
    setDismissed(true);
    setCloseDialogOpen(false);
  }, []);
  const goUpgrade = useCallback(() => openAccount("plans"), []);
  const goBuyTokens = useCallback(() => openAccount("tokens"), []);

  const value = useMemo<PromoContextValue>(
    () => ({
      showHeader,
      headerOffer,
      isGuest,
      showCard,
      cardVariant,
      closeDialogOpen,
      openCloseDialog,
      closeDialogCancel,
      keepOffer,
      upgradeFromDialog,
      dismissHeader,
      goUpgrade,
      goBuyTokens,
    }),
    [
      showHeader,
      headerOffer,
      isGuest,
      showCard,
      cardVariant,
      closeDialogOpen,
      openCloseDialog,
      closeDialogCancel,
      keepOffer,
      upgradeFromDialog,
      dismissHeader,
      goUpgrade,
      goBuyTokens,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePromo(): PromoContextValue {
  const value = useContext(Ctx);
  if (!value) throw new Error("usePromo must be used within PromoProvider");
  return value;
}

