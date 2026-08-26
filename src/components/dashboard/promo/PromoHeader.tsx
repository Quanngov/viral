"use client";

import { useEffect, useState } from "react";
import { Users, Zap } from "lucide-react";
import { useAuthGateOptional } from "@/components/dashboard/AuthGateProvider";
import { formatRemaining, usePromo } from "./PromoProvider";

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

/** Верхний компактный промо-хедер в премиальном графитово-золотом стиле. */
export function PromoHeader() {
  const promo = usePromo();
  const authGate = useAuthGateOptional();
  const isGuest = promo.isGuest;
  const [now, setNow] = useState(() => Date.now());
  const o = promo.headerOffer;

  useEffect(() => {
    if (isGuest || !promo.showHeader || !o) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isGuest, promo.showHeader, o]);

  if (!promo.showHeader) return null;

  // Незарегистрированный пользователь — регистрационный хедер (без скидок/цен/таймера).
  if (isGuest) {
    return (
      <div className="relative grid w-full shrink-0 grid-cols-1 items-center overflow-hidden rounded-b-xl border border-amber-400/25 bg-[#0e0f12] px-6 py-2 shadow-[0_0_24px_rgba(251,191,36,0.06)] lg:grid-cols-[1fr_auto_1fr] lg:gap-x-3">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(251,191,36,0.10),transparent_50%)]"
        />
        <div aria-hidden className="hidden lg:block" />
        <div className="relative flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span className="text-lg font-black leading-none tracking-tight text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]">
            Пробный режим
          </span>
          <span className="text-sm text-zinc-300">Чтобы открыть все функции зарегистрируйтесь</span>
          <button
            type="button"
            onClick={() => authGate?.openAuth?.("signup")}
            className="relative inline-flex items-center rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-1 text-xs font-bold text-zinc-900 shadow-[0_0_14px_rgba(251,191,36,0.18)] transition hover:from-amber-200 hover:to-amber-400"
          >
            Регистрация
          </button>
        </div>
        <button
          type="button"
          onClick={promo.dismissHeader}
          aria-label="Закрыть"
          className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/5 hover:text-amber-300"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (!o) return null;
  const remainingMs = o ? Math.max(0, new Date(o.expiresAt).getTime() - now) : 0;
  if (remainingMs <= 0) return null;

  return (
    <div className="relative grid w-full shrink-0 grid-cols-1 items-center overflow-hidden rounded-b-xl border border-amber-400/25 bg-[#0e0f12] px-6 py-2 shadow-[0_0_24px_rgba(251,191,36,0.06)] lg:grid-cols-[1fr_auto_1fr] lg:gap-x-3">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(251,191,36,0.10),transparent_50%)]"
      />
      <div aria-hidden className="hidden lg:block" />

      <div className="relative flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span className="flex items-baseline gap-x-1.5">
          <span className="text-lg font-black leading-none tracking-tight text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]">
            −{o.discountPct}%
          </span>
          <span className="text-sm font-black tracking-tight text-amber-400">НА {o.nextPlanName}</span>
        </span>

        <span className="flex items-baseline gap-x-2">
          <span className="text-xl font-black tabular-nums leading-none text-white">
            {o.discountedRub.toLocaleString("ru-RU")} ₽
          </span>
          <span className="text-xs font-medium tabular-nums text-zinc-500 line-through">
            {o.priceRub.toLocaleString("ru-RU")} ₽
          </span>
        </span>

        <span className="flex items-center gap-1.5 text-xs text-zinc-300">
          <Zap className="h-3.5 w-3.5 text-amber-400" fill="currentColor" strokeWidth={1} />
          {o.tokensPerPeriod.toLocaleString("ru-RU")} токенов
          <span className="text-zinc-500">·</span>
          <Users className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.6} />
          {o.maxCompetitors} месячных конкурентов
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.05] px-2 py-1 font-mono text-xs tabular-nums text-amber-300 ring-1 ring-amber-400/20">
          <ClockIcon className="h-3.5 w-3.5 text-amber-400" />
          {formatRemaining(remainingMs)}
        </span>

        <button
          type="button"
          onClick={promo.goUpgrade}
          className="relative inline-flex items-center rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 px-2.5 py-1 text-xs font-bold text-zinc-900 shadow-[0_0_14px_rgba(251,191,36,0.18)] transition hover:from-amber-200 hover:to-amber-400"
        >
          Улучшить
        </button>
      </div>

      <button
        type="button"
        onClick={promo.openCloseDialog}
        aria-label="Закрыть предложение"
        className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/5 hover:text-amber-300"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

