"use client";

import { DashboardModal } from "@/components/dashboard/DashboardModal";
import {
  AccountPlansContent,
  AccountTokensContent,
} from "@/components/dashboard/billing-panels";
import { AccountSettingsContent } from "@/components/dashboard/mock-dashboard-panels";

export type AccountPanelTab = "settings" | "plans" | "tokens";

const ALL_TABS: { id: AccountPanelTab; label: string }[] = [
  { id: "settings", label: "Настройки" },
  { id: "plans", label: "Тарифы" },
  { id: "tokens", label: "Токены" },
];

type AccountPanelProps = {
  open: boolean;
  activeTab: AccountPanelTab;
  onTabChange: (tab: AccountPanelTab) => void;
  onClose: () => void;
  email: string;
  plan: string;
  balanceTokens: number;
  /** Pricing + token packs only — no settings tab. */
  billingOnly?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
};

export function AccountPanel({
  open,
  activeTab,
  onTabChange,
  onClose,
  email,
  plan,
  balanceTokens,
  billingOnly = false,
  onLogin,
  onLogout,
}: AccountPanelProps) {
  const tabs = billingOnly ? ALL_TABS.filter((t) => t.id !== "settings") : ALL_TABS;

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title={billingOnly ? "Тарифы и токены" : "Аккаунт"}
      subtitle={billingOnly ? "Подписка и пакеты токенов." : "Тарифы и токены."}
      placement="center"
      wide
    >
      <div className="-mx-1 flex overflow-x-auto rounded-xl bg-zinc-100 p-1 scrollbar-hidden">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
              activeTab === t.id
                ? "bg-white text-emerald-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {!billingOnly && activeTab === "settings" ? <AccountSettingsContent /> : null}
        {activeTab === "plans" ? <AccountPlansContent balanceTokens={balanceTokens} /> : null}
        {activeTab === "tokens" ? <AccountTokensContent balanceTokens={balanceTokens} /> : null}
      </div>
    </DashboardModal>
  );
}
