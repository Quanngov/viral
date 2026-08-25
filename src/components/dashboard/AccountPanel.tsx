"use client";

import { DashboardModal } from "@/components/dashboard/DashboardModal";
import {
  AccountPlansContent,
  AccountSummary,
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
  planName: string;
  balanceTokens: number;
  /** Secondary billing stats — optional, shown when provided. */
  nextGrantAt?: string | null;
  totalSpent?: number;
  totalGranted?: number;
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
  planName,
  balanceTokens,
  nextGrantAt = null,
  totalSpent = 0,
  totalGranted = 0,
  billingOnly = false,
}: AccountPanelProps) {
  const tabs = billingOnly ? ALL_TABS.filter((t) => t.id !== "settings") : ALL_TABS;

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Аккаунт"
      subtitle="Баланс, тариф и настройки."
      placement="center"
      wide
    >
      <AccountSummary
        planName={planName}
        balanceTokens={balanceTokens}
        nextGrantAt={nextGrantAt}
        totalSpent={totalSpent}
        totalGranted={totalGranted}
        onTopUp={() => onTabChange("tokens")}
        onManagePlan={() => onTabChange("plans")}
      />

      <div className="mt-4 -mx-1 flex overflow-x-auto rounded-xl bg-zinc-100 p-1 scrollbar-hidden">
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
        {activeTab === "plans" ? <AccountPlansContent /> : null}
        {activeTab === "tokens" ? <AccountTokensContent /> : null}
      </div>
    </DashboardModal>
  );
}
