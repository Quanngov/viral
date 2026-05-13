"use client";

import { FilePenLine } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import type { MockUser } from "@/lib/mock-data";
import { DashboardAnchoredLayer } from "@/components/dashboard/DashboardModal";
import {
  MockAuthModal,
  MockProfileModal,
  MockSettingsModal,
  MockSimpleInfoModal,
  MockTokenPlansModal,
} from "@/components/dashboard/mock-dashboard-panels";
import { formatTokensRuSpace } from "@/lib/format-metrics";

export type DashboardView = "home" | "competitors" | "saved" | "scripts";

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

const SERVICE_NAME = "TrendRadar";

type UserPanelProps = {
  user: MockUser;
  activeView: DashboardView;
  onChangeView: (view: DashboardView) => void;
};

export function UserPanel({ user, activeView, onChangeView }: UserPanelProps) {
  const profileWrapRef = useRef<HTMLDivElement>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [tokenPlansOpen, setTokenPlansOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "logout">("login");
  const [serviceMenuOpen, setServiceMenuOpen] = useState(false);

  const closeProfileMenu = () => setProfileMenuOpen(false);

  return (
    <aside className="shrink-0 bg-transparent px-3 pb-3 pt-2">
      <div className="flex flex-col rounded-xl bg-white p-3 shadow-sm shadow-zinc-900/5">
        <p className="mb-2 truncate text-xs font-medium text-zinc-500">{user.email}</p>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 shadow-sm shadow-emerald-900/5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold tracking-tight text-emerald-900">{user.plan}</span>
              <span className="flex items-center gap-1 text-lg font-bold tabular-nums tracking-tight text-emerald-900">
                {formatTokensRuSpace(user.tokens)}
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M13.75 2.75 6.5 13h4.75L10.25 21.25 17.5 11h-4.75l1-8.25Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTokenPlansOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-900"
            aria-label="Пополнить токены"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5.25v13.5M5.25 12h13.5" />
            </svg>
          </button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              closeProfileMenu();
              setSettingsOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-1.5 text-[11px] font-medium text-zinc-700 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-900"
          >
            <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            Настройки
          </button>
          <div ref={profileWrapRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((v) => !v)}
              aria-expanded={profileMenuOpen}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-1.5 text-[11px] font-medium text-zinc-700 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-900"
            >
              <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              Профиль
            </button>
            <DashboardAnchoredLayer
              open={profileMenuOpen}
              onClose={() => setProfileMenuOpen(false)}
              anchorRef={profileWrapRef}
              matchAnchorWidth
            >
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-xs font-medium text-zinc-800 hover:bg-emerald-50"
                onClick={() => {
                  closeProfileMenu();
                  setProfileModalOpen(true);
                }}
              >
                Профиль
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-xs font-medium text-zinc-800 hover:bg-emerald-50"
                onClick={() => {
                  closeProfileMenu();
                  setSettingsOpen(true);
                }}
              >
                Настройки
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-xs font-medium text-zinc-800 hover:bg-emerald-50"
                onClick={() => {
                  closeProfileMenu();
                  setTokenPlansOpen(true);
                }}
              >
                Тарифы
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-xs font-medium text-zinc-800 hover:bg-emerald-50"
                onClick={() => {
                  closeProfileMenu();
                  setAuthMode("login");
                  setAuthOpen(true);
                }}
              >
                Войти
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-xs font-medium text-zinc-800 hover:bg-emerald-50"
                onClick={() => {
                  closeProfileMenu();
                  setAuthMode("logout");
                  setAuthOpen(true);
                }}
              >
                Выйти
              </button>
            </DashboardAnchoredLayer>
          </div>
        </div>

        <nav className="mt-2 flex flex-col gap-0 border-t border-zinc-100 pt-1.5">
          {tools.map((item) => (
            <button
              key={item.key}
              type="button"
              disabled={item.soon}
              onClick={() => {
                if (item.view) onChangeView(item.view);
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
          ))}
        </nav>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2">
          <span className="truncate text-base font-semibold tracking-tight text-zinc-800">{SERVICE_NAME}</span>
          <button
            type="button"
            onClick={() => setServiceMenuOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-800"
            aria-label="Меню сервиса"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75a2.25 2.25 0 0 1 2.25-2.25h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
            </svg>
          </button>
        </div>
      </div>

      <MockTokenPlansModal open={tokenPlansOpen} onClose={() => setTokenPlansOpen(false)} balanceTokens={user.tokens} />
      <MockSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <MockProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        email={user.email}
        plan={user.plan}
        anchorRef={profileWrapRef}
      />
      <MockAuthModal open={authOpen} onClose={() => setAuthOpen(false)} mode={authMode} />
      <MockSimpleInfoModal
        open={serviceMenuOpen}
        onClose={() => setServiceMenuOpen(false)}
        title="Сервис"
        body="Демо-меню: поддержка, документация и юридическая информация появятся позже. Рабочие функции дашборда не затронуты."
      />
    </aside>
  );
}
