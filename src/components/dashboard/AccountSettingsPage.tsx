"use client";

import { Settings } from "lucide-react";
import { AccountSettingsContent } from "@/components/dashboard/mock-dashboard-panels";

/**
 * Полноценная вкладка Dashboard «Настройки аккаунта».
 *
 * Раньше открывалась как модальное окно (AccountPanel → settings);
 * теперь рендерится как отдельная страница-вкладка внутри Dashboard,
 * по тому же принципу, что и «Профиль» (ProfileHubPage).
 *
 * Переиспользует существующий `AccountSettingsContent` — все настройки
 * и их функциональность сохранены полностью.
 */
export function AccountSettingsPage() {
  return (
    <div className="account-settings-page mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Settings className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Настройки аккаунта</h1>
            <p className="text-sm text-zinc-500">Управление аккаунтом, уведомлениями и внешним видом.</p>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <AccountSettingsContent />
      </div>
    </div>
  );
}
