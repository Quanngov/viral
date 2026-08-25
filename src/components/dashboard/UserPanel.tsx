"use client";

import { Crown, FilePenLine, Loader2 } from "lucide-react";
import { Fragment, useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuthDisplay } from "@/hooks/use-auth-display";
import { useAuthGate } from "@/components/dashboard/AuthGateProvider";
import { AccountPanel, type AccountPanelTab } from "@/components/dashboard/AccountPanel";
import type { GridVideo } from "@/lib/mock-data";
import { ViralLogo } from "@/components/landing/ui/ViralLogo";
import { useCountUp } from "@/hooks/use-count-up";
import { formatTokensRuSpace } from "@/lib/format-metrics";
import { loadTokenBalance } from "@/lib/dashboard-fetch";
import { BILLING_PLANS, getSubscriptionGrantTokens, type BillingPlanId } from "@/lib/billing/billing.config";

export type DashboardView = "home" | "competitors" | "saved" | "scripts" | "profile" | "settings";

/** Следующий тариф для CTA «Улучшить» (BUSINESS — нет выше). */
const NEXT_PLAN: Partial<Record<BillingPlanId, BillingPlanId>> = {
  FREE: "PRO",
  TRIAL: "PRO",
  PRO: "BUSINESS",
};

/** Количество коротких пунктирных делений шкалы остатка токенов. */
const TOKEN_SCALE_SEGMENTS = 16;

const tools: { key: string; label: string; view?: DashboardView; soon?: boolean; icon: ReactNode }[] = [
  {
    key: "home",
    label: "Главная",
    view: "home",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    key: "competitors",
    label: "Шпион конкурентов",
    view: "competitors",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
  {
    key: "saved",
    label: "Сохраненные ролики",
    view: "saved",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.65} stroke="currentColor" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 4.5h12A1.5 1.5 0 0 1 19.5 6v15.75L12 17.25l-7.5 4.5V6A1.5 1.5 0 0 1 6 4.5Z"
        />
      </svg>
    ),
  },
  {
    key: "scripts",
    label: "Генерация сценариев",
    view: "scripts",
    icon: (
      <span className="text-current [&>svg]:h-4 [&>svg]:w-4">
        <FilePenLine className="h-4 w-4" strokeWidth={2} aria-hidden />
      </span>
    ),
  },
  {
    key: "profile",
    label: "Профиль",
    view: "profile",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
  {
    key: "content-radar",
    label: "Контент-Радар (скоро)",
    soon: true,
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
];

type UserPanelProps = {
  activeView: DashboardView;
  onChangeView: (view: DashboardView) => void;
  layout?: "sidebar" | "bottom-nav";
  onVideoClick?: (video: GridVideo) => void;
};

const accountModals = (
  props: {
    accountPanelOpen: boolean;
    accountPanelTab: AccountPanelTab;
    accountPanelBillingOnly: boolean;
    setAccountPanelTab: (tab: AccountPanelTab) => void;
    setAccountPanelOpen: (open: boolean) => void;
    showAuthed: boolean;
    displayEmail: string;
    displayTokens: number;
    planName: string;
    nextGrantAt: string | null;
    totalSpent: number;
    totalGranted: number;
    onLogout: () => void;
  },
) => (
  <>
    {props.showAuthed ? (
      <AccountPanel
        open={props.accountPanelOpen}
        activeTab={props.accountPanelTab}
        onTabChange={props.setAccountPanelTab}
        onClose={() => props.setAccountPanelOpen(false)}
        email={props.displayEmail}
        planName={props.planName}
        balanceTokens={props.displayTokens}
        nextGrantAt={props.nextGrantAt}
        totalSpent={props.totalSpent}
        totalGranted={props.totalGranted}
        billingOnly={props.accountPanelBillingOnly}
        onLogout={props.onLogout}
      />
    ) : null}
  </>
);

export function UserPanel({ activeView, onChangeView, layout = "sidebar", onVideoClick }: UserPanelProps) {
  const { showAuthed, showGuest, showAuthPlaceholder, sessionLoading, displayEmail } =
    useAuthDisplay();
  const { openAuth } = useAuthGate();
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);
  const [accountPanelTab, setAccountPanelTab] = useState<AccountPanelTab>("settings");
  const [accountPanelBillingOnly, setAccountPanelBillingOnly] = useState(false);
  const [planName, setPlanName] = useState(BILLING_PLANS.FREE.name);
  const [planId, setPlanId] = useState<BillingPlanId>("FREE");
  const [balance, setBalance] = useState(0);
  const [balanceLoaded, setBalanceLoaded] = useState(false);
  const [billingMe, setBillingMe] = useState<{
    subscription?: { nextGrantAt?: string | null };
    wallet?: { totalSpent?: number; totalGranted?: number };
  } | null>(null);

  const refreshBilling = useCallback(async () => {
    try {
      const tokenRes = await loadTokenBalance();
      if (tokenRes.data !== null) setBalance(tokenRes.data);
      const billingRes = await fetch("/api/billing/me", { cache: "no-store" });
      if (billingRes.ok) {
        const data = (await billingRes.json()) as {
          subscription?: { plan?: BillingPlanId; nextGrantAt?: string | null };
          wallet?: { totalSpent?: number; totalGranted?: number };
        };
        const planId = data.subscription?.plan ?? "FREE";
        setPlanName(BILLING_PLANS[planId]?.name ?? BILLING_PLANS.FREE.name);
        setPlanId(planId);
        setBillingMe(data);
      }
    } catch {
      /* keep last known plan */
    } finally {
      setBalanceLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!showAuthed || sessionLoading) return;
    const timer = window.setTimeout(() => {
      void refreshBilling();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [showAuthed, sessionLoading, displayEmail, refreshBilling]);

  useEffect(() => {
    const onTokensUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ balance?: number }>).detail;
      if (typeof detail?.balance === "number") {
        setBalance(detail.balance);
        setBalanceLoaded(true);
      }
    };
    window.addEventListener("viral:tokens-updated", onTokensUpdated);
    return () => window.removeEventListener("viral:tokens-updated", onTokensUpdated);
  }, []);

  const displayTokens = useCountUp(balance, {
    animate: balanceLoaded && balance > 0,
  });
  const authFade = sessionLoading ? "opacity-60" : "opacity-100";

  const navigateToView = (view: DashboardView) => {
    if (view === "profile" && !showAuthed) {
      openAuth("login");
      return;
    }
    onChangeView(view);
  };

  const openAccountPanel = useCallback((tab: AccountPanelTab, billingOnly = false) => {
    if (!showAuthed) {
      openAuth("login");
      return;
    }
    setAccountPanelBillingOnly(billingOnly);
    setAccountPanelTab(tab);
    setAccountPanelOpen(true);
  }, [showAuthed, openAuth]);

  useEffect(() => {
    const onOpenAccount = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: AccountPanelTab; billingOnly?: boolean }>).detail;
      const tab = detail?.tab ?? "plans";
      openAccountPanel(tab, detail?.billingOnly ?? tab !== "settings");
    };
    window.addEventListener("viral:open-account", onOpenAccount);
    return () => window.removeEventListener("viral:open-account", onOpenAccount);
  }, [openAccountPanel]);

  const modalProps = {
    accountPanelOpen,
    accountPanelTab,
    accountPanelBillingOnly,
    setAccountPanelTab,
    setAccountPanelOpen,
    showAuthed,
    displayEmail,
    displayTokens,
    planName,
    nextGrantAt: billingMe?.subscription?.nextGrantAt ?? null,
    totalSpent: billingMe?.wallet?.totalSpent ?? 0,
    totalGranted: billingMe?.wallet?.totalGranted ?? 0,
    onLogout: () => {
      setAccountPanelOpen(false);
      openAuth("logout");
    },
  };

  const balanceLoading = showAuthed && !balanceLoaded;

  // Лимит токенов текущего тарифа и доля остатка (для шкалы).
  const planTotalTokens = getSubscriptionGrantTokens(planId);
  const remainingPct = planTotalTokens > 0 ? Math.max(0, Math.min(100, (displayTokens / planTotalTokens) * 100)) : 0;
  const nextPlanId = NEXT_PLAN[planId];

  const authPlaceholder = (
    <div className="mb-2 pt-3 hidden min-h-[2.5rem] flex-row gap-2 lg:flex" aria-hidden>
      <div className="skeleton-breathe flex-1 rounded-lg" />
      <div className="skeleton-breathe flex-1 rounded-lg" />
    </div>
  );

  const guestAuthButtons = (
    <div className="dashboard-fade-in mb-2 pt-3 hidden flex-row gap-2 lg:flex">
      <button
        type="button"
        onClick={() => openAuth("login")}
        className="dashboard-ease flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Войти
      </button>
      <button
        type="button"
        onClick={() => openAuth("signup")}
        className="dashboard-ease flex-1 rounded-lg border border-zinc-200 bg-white py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
      >
        Регистрация
      </button>
    </div>
  );

  if (layout === "bottom-nav") {
    return (
      <>
        <nav className="flex gap-1 px-2 py-2">
          {tools
            .filter((item) => !item.soon)
            .map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => item.view && navigateToView(item.view)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-1.5 py-2 text-xs font-medium transition-colors ${
                  item.view === activeView
                    ? "bg-emerald-100 text-emerald-900"
                    : "text-zinc-700 hover:bg-emerald-50 hover:text-emerald-900"
                }`}
                aria-label={item.label}
              >
                <span className="flex h-5 w-5 items-center justify-center [&>svg]:h-5 [&>svg]:w-5">
                  {item.icon}
                </span>
                <span className="max-w-full truncate text-[10px] leading-tight">{item.label.split(" ")[0]}</span>
              </button>
            ))}
        </nav>
        {accountModals(modalProps)}
      </>
    );
  }

  return (
    <aside className="shrink-0 bg-transparent px-0 pb-0 pt-0">
      <div className="flex flex-col rounded-xl bg-white px-3 pb-3 shadow-sm shadow-zinc-900/5 lg:flex-col">
        {showAuthPlaceholder ? authPlaceholder : null}
        {showGuest ? guestAuthButtons : null}
        {showAuthed ? (
        <div className={`dashboard-ease hidden lg:block ${authFade}`}>
          <div className="-mx-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-2.5 pt-2.5 pb-1.5">
            <p
              className={`dashboard-ease mt-1 hidden truncate text-xs font-medium text-emerald-800/70 lg:block ${authFade}`}
            >
              {displayEmail}
            </p>

            <div className="mt-3.5 flex items-start justify-between gap-2">
              <p className="min-w-0 truncate text-lg font-semibold leading-none text-emerald-900">{planName}</p>
              <p className="flex shrink-0 items-center gap-1 text-emerald-900">
                {balanceLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" aria-label="Загрузка баланса" />
                ) : (
                  <>
                    <span className="text-lg font-bold tabular-nums leading-none tracking-tight">
                      {formatTokensRuSpace(displayTokens)}
                    </span>
                    <span className="text-sm font-medium text-emerald-800/70">/ {formatTokensRuSpace(planTotalTokens)}</span>
                    <svg className="h-3.5 w-3.5 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M13.75 2.75 6.5 13h4.75L10.25 21.25 17.5 11h-4.75l1-8.25Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </p>
            </div>

            {planTotalTokens > 0 ? (
              <div
                className="mt-1 flex w-full gap-1"
                role="img"
                aria-label={`Осталось примерно ${Math.round(remainingPct)}% токенов тарифа`}
              >
                {Array.from({ length: TOKEN_SCALE_SEGMENTS }).map((_, i) => {
                  const step = 100 / TOKEN_SCALE_SEGMENTS;
                  const segFill = Math.max(0, Math.min(100, ((remainingPct - i * step) / step) * 100));
                  return (
                    <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-emerald-900/10">
                      <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${segFill}%` }} />
                    </span>
                  );
                })}
              </div>
            ) : null}

            {nextPlanId ? (
              <button
                type="button"
                onClick={() => openAccountPanel("plans", true)}
                className="group mt-4 flex w-full items-center justify-between gap-2 rounded-lg text-left"
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-emerald-900 transition-colors group-hover:text-emerald-700">
                  <Crown className="h-4 w-4 shrink-0 text-emerald-600" fill="currentColor" strokeWidth={0} aria-hidden />
                  <span className="truncate">Перейти на {nextPlanId}</span>
                </span>
                <span className="shrink-0 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-emerald-700">
                  Улучшить
                </span>
              </button>
            ) : null}
          </div>
        </div>
        ) : null}

        {/* Desktop navigation */}
        <nav className="mt-1.5 hidden flex-col gap-0 border-t border-zinc-100 pt-1.5 lg:flex">
          {tools.map((item) => (
            <Fragment key={item.key}>
              <button
                type="button"
                disabled={item.soon}
                onClick={() => {
                  if (item.view) navigateToView(item.view);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  item.view && activeView === item.view
                    ? "bg-emerald-50 text-emerald-900"
                    : "text-zinc-800 hover:bg-emerald-50 hover:text-emerald-900"
                }`}
              >
                <span
                  className={`shrink-0 [&>svg]:h-4 [&>svg]:w-4 ${
                    item.view && activeView === item.view ? "text-emerald-600" : "text-zinc-400"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="leading-snug">{item.label}</span>
              </button>
              {showAuthed && item.view === "profile" ? (
                <button
                  type="button"
                  onClick={() => navigateToView("settings")}
                  className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-sm font-medium transition-colors ${
                    activeView === "settings"
                      ? "bg-emerald-50 text-emerald-900"
                      : "text-zinc-800 hover:bg-emerald-50 hover:text-emerald-900"
                  }`}
                >
                  <span
                    className={`shrink-0 [&>svg]:h-4 [&>svg]:w-4 ${
                      activeView === "settings" ? "text-emerald-600" : "text-zinc-400"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  </span>
                  <span className="leading-snug">Настройки аккаунта</span>
                </button>
              ) : null}
            </Fragment>
          ))}
        </nav>


        <div className="mt-2 hidden border-t border-zinc-100 pt-2 lg:block">
          <ViralLogo size="sm" showWordmark />
        </div>
      </div>

      {accountModals(modalProps)}
    </aside>
  );
}
