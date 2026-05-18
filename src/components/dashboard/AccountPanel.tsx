"use client";

import { DashboardModal } from "@/components/dashboard/DashboardModal";
import {
  AccountPlansContent,
  AccountProfileContent,
  AccountSettingsContent,
  AccountTokensContent,
} from "@/components/dashboard/mock-dashboard-panels";

export type AccountPanelTab = "settings" | "profile" | "plans" | "tokens";

const TABS: { id: AccountPanelTab; label: string }[] = [
  { id: "settings", label: "Настройки" },
  { id: "profile", label: "Профиль" },
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
  onLogin,
  onLogout,
}: AccountPanelProps) {
  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Аккаунт"
      subtitle="Демо-интерфейс без сохранения в БД."
      placement="center"
      wide
    >
      <div className="-mx-1 flex overflow-x-auto rounded-xl bg-zinc-100 p-1 scrollbar-hidden">
        {TABS.map((t) => (
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
        {activeTab === "settings" ? <AccountSettingsContent /> : null}
        {activeTab === "profile" ? (
          <AccountProfileContent
            email={email}
            plan={plan}
            balanceTokens={balanceTokens}
            onLogin={onLogin}
            onLogout={onLogout}
          />
        ) : null}
        {activeTab === "plans" ? <AccountPlansContent balanceTokens={balanceTokens} /> : null}
        {activeTab === "tokens" ? <AccountTokensContent balanceTokens={balanceTokens} /> : null}
      </div>
    </DashboardModal>
  );
}
