"use client";

import { DashboardModal } from "@/components/dashboard/DashboardModal";
import { formatRemaining, getOfferRemainingMs, usePromo } from "./PromoProvider";

function formatRub(n: number): string {
  return `${Math.max(0, Math.floor(n)).toLocaleString("ru-RU")} ₽`;
}

/** Confirmation-диалог закрытия хедера: показывает конкретный оффер и цены. */
export function PromoCloseDialog() {
  const promo = usePromo();
  const o = promo.headerOffer;
  const remainingMs = o ? getOfferRemainingMs(o.expiresAt) : 0;

  return (
    <DashboardModal
      open={promo.closeDialogOpen}
      onClose={promo.closeDialogCancel}
      title="Закрыть предложение?"
      placement="center"
      compact
    >
      <div className="space-y-4 text-sm">
        <p className="text-zinc-700">
          Вы потеряете скидку <span className="font-semibold text-amber-600">{o?.title}</span>.
        </p>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
          <p className="text-xs text-zinc-500">Сейчас {o?.nextPlanName} стоит</p>
          <p className="mt-0.5 text-base font-semibold text-zinc-900">
            {formatRub(o?.discountedRub ?? 0)}{" "}
            <span className="text-sm font-normal text-zinc-400 line-through">{formatRub(o?.priceRub ?? 0)}</span>
          </p>
          <p className="mt-1 text-xs font-medium text-amber-600">Вы экономите {formatRub(o?.savingsRub ?? 0)}</p>
        </div>

        <p className="text-xs text-zinc-500">
          Предложение действует ещё{" "}
          <span className="font-mono tabular-nums text-zinc-700">{formatRemaining(remainingMs)}</span>.
        </p>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={promo.upgradeFromDialog}
            className="rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-2 text-sm font-bold text-zinc-900 transition hover:from-amber-200 hover:to-amber-400"
          >
            Улучшить тариф
          </button>
          <button
            type="button"
            onClick={promo.keepOffer}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:border-amber-300 hover:bg-zinc-50 hover:text-amber-900"
          >
            Оставить предложение
          </button>
        </div>
      </div>
    </DashboardModal>
  );
}
