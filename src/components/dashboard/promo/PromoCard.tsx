"use client";

import type { ReactNode } from "react";
import { Crown, PenLine, Search, Users, Zap } from "lucide-react";
import { useBilling } from "@/components/dashboard/BillingContext";
import { useAuthGateOptional } from "@/components/dashboard/AuthGateProvider";
import { computeTokenPackOffer, computeUpgradeOffer } from "@/lib/billing/promo";
import { BILLING_PLANS } from "@/lib/billing/billing.config";
import { usePromo } from "./PromoProvider";

const TOKEN_PACK = "MEDIUM" as const;

const CARD_CLASS =
  "dashboard-ease group relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-2xl border border-amber-400/30 bg-[#0e0f12] p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-400/50 hover:shadow-[0_0_40px_rgba(251,191,36,0.16)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2";

const CTA_CLASS =
  "mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-2.5 text-sm font-bold text-zinc-900 shadow-[0_0_18px_rgba(251,191,36,0.22)] transition group-hover:from-amber-200 group-hover:to-amber-400 group-hover:shadow-[0_0_26px_rgba(251,191,36,0.32)]";

/** Мелкая золотая декоративная частица/блик. */
function Sparkle({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute h-1 w-1 rounded-full bg-amber-300/80 blur-[1px] ${className ?? ""}`}
    />
  );
}

/** Объёмный золотой декоративный элемент (корона / молния) с мягким свечением. */
function GoldBadge({ children }: { children: ReactNode }) {
  return (
    <div className="relative shrink-0">
      <span aria-hidden className="pointer-events-none absolute -inset-2 rounded-full bg-amber-400/20 blur-lg" />
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-xl bg-amber-400/20 blur-md" />
      <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-b from-amber-200 to-amber-500 text-amber-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_6px_16px_rgba(0,0,0,0.35)]">
        {children}
      </div>
      <Sparkle className="right-0 top-0" />
      <Sparkle className="-right-1 bottom-3" />
      <Sparkle className="left-1 -top-1 h-[3px] w-[3px]" />
    </div>
  );
}

/** Пункт преимуществ тарифа: тёмная подложка, золотая иконка, значение, описание. */
function FeatureRow({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-amber-400 ring-1 ring-amber-400/15">
        {icon}
      </span>
      <span className="text-sm font-black tabular-nums leading-none text-amber-400">{value}</span>
      <span className="truncate text-[11px] leading-tight text-zinc-300">{label}</span>
    </div>
  );
}

/** Промо-карточка в ленте видео (занимает место первой карточки в обычном состоянии). */
export function PromoCard() {
  const promo = usePromo();
  const billing = useBilling();
  const authGate = useAuthGateOptional();
  if (!promo.showCard) return null;

  // Общий тёмный фон + тонкое золотое свечение сверху.
  const glow =
    "pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(251,191,36,0.10),transparent_55%)]";

  // Незарегистрированный пользователь — регистрационная карточка вместо рекламного оффера.
  if (promo.isGuest) {
    return (
      <button type="button" onClick={() => authGate?.openAuth?.("signup")} className={CARD_CLASS}>
        <span aria-hidden className={glow} />
        <div>
          <p className="text-2xl font-black leading-tight tracking-tight text-amber-400 drop-shadow-[0_0_14px_rgba(251,191,36,0.35)]">
            Пробный режим
          </p>
          <p className="mt-2 text-sm leading-snug text-zinc-300">
            Зарегистрируйтесь, чтобы открыть полный доступ к функциям ViralCloud
          </p>
        </div>

        <div className="mt-4 space-y-2.5 border-t border-white/10 pt-3">
          <FeatureRow
            icon={<Search className="h-3.5 w-3.5" strokeWidth={1.6} />}
            value="Поиск видео"
            label="и тренды"
          />
          <FeatureRow
            icon={<Users className="h-3.5 w-3.5" strokeWidth={1.6} />}
            value="Конкуренты"
            label="мониторинг"
          />
          <FeatureRow
            icon={<PenLine className="h-3.5 w-3.5" strokeWidth={1.6} />}
            value="Скрипты"
            label="и AI-генератор"
          />
        </div>

        <span className={CTA_CLASS}>Регистрация</span>
      </button>
    );
  }

  if (promo.cardVariant === "upgrade") {
    const offer = computeUpgradeOffer(billing.planId);
    if (!offer) return null;
    const plan = BILLING_PLANS[offer.nextPlanId];
    return (
      <button type="button" onClick={promo.goUpgrade} className={CARD_CLASS}>
        <span aria-hidden className={glow} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[34px] font-black leading-none tracking-tight text-amber-400 drop-shadow-[0_0_14px_rgba(251,191,36,0.35)]">
              −{offer.discountPct}%
            </p>
            <p className="mt-1 text-[34px] font-black leading-none tracking-tight text-amber-400">НА {offer.nextPlanName}</p>
          </div>
          <GoldBadge>
            <Crown className="h-7 w-7" strokeWidth={1.4} />
          </GoldBadge>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl font-black tabular-nums leading-none text-white">
            {offer.discountedRub.toLocaleString("ru-RU")} ₽
          </span>
          <span className="text-sm font-medium tabular-nums text-zinc-500 line-through">
            {offer.priceRub.toLocaleString("ru-RU")} ₽
          </span>
        </div>
        <p className="mt-1.5 text-sm font-bold text-amber-400">Экономия {offer.savingsRub.toLocaleString("ru-RU")} ₽</p>

        <div className="mt-4 space-y-2.5 border-t border-white/10 pt-3">
          <FeatureRow
            icon={<Zap className="h-3.5 w-3.5" fill="currentColor" strokeWidth={1} />}
            value={plan.tokensPerPeriod.toLocaleString("ru-RU")}
            label="токенов / месяц"
          />
          <FeatureRow
            icon={<Users className="h-3.5 w-3.5" strokeWidth={1.6} />}
            value={String(plan.maxCompetitors)}
            label="конкурентов"
          />
        </div>

        <span className={CTA_CLASS}>Улучшить</span>
      </button>
    );
  }

  const offer = computeTokenPackOffer(TOKEN_PACK);
  return (
    <button type="button" onClick={promo.goBuyTokens} className={CARD_CLASS}>
      <span aria-hidden className={glow} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[34px] font-black leading-none tracking-tight text-amber-400 drop-shadow-[0_0_14px_rgba(251,191,36,0.35)]">
            Токены
          </p>
          <p className="mt-1 text-base font-semibold leading-tight text-white">выгодный пакет</p>
        </div>
        <GoldBadge>
          <Zap className="h-7 w-7" fill="currentColor" strokeWidth={1.2} />
        </GoldBadge>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl font-black tabular-nums leading-none text-white">
          {offer.tokens.toLocaleString("ru-RU")}
        </span>
        <span className="text-sm font-medium text-zinc-300">токенов</span>
      </div>
      <p className="mt-1.5 text-base font-bold tabular-nums text-amber-400">
        {offer.priceRub.toLocaleString("ru-RU")} ₽
      </p>

      <div className="mt-4 space-y-2.5 border-t border-white/10 pt-3">
        <FeatureRow
          icon={<Zap className="h-3.5 w-3.5" fill="currentColor" strokeWidth={1} />}
          value={offer.tokens.toLocaleString("ru-RU")}
          label="токенов единоразово"
        />
        <FeatureRow
          icon={<Crown className="h-3.5 w-3.5" strokeWidth={1.4} />}
          value={offer.priceRub.toLocaleString("ru-RU")}
          label="₽ / разово"
        />
      </div>

      <span className={CTA_CLASS}>Купить токены</span>
    </button>
  );
}

