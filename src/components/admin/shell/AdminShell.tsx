"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { AdminProvider } from "@/components/admin/shell/AdminContext";
import { AdminSidebar, AdminTopBar } from "@/components/admin/shell/AdminSidebar";

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <AdminProvider>
      <div className="flex h-dvh min-h-0 bg-zinc-50 text-zinc-900">
        {mobileNav ? (
          <button
            type="button"
            aria-label="Закрыть меню"
            className="fixed inset-0 z-40 bg-zinc-900/40 lg:hidden"
            onClick={() => setMobileNav(false)}
          />
        ) : null}
        <div
          className={`fixed inset-y-0 left-0 z-50 transition-transform lg:static lg:translate-x-0 ${
            mobileNav ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <AdminSidebar onNavigate={() => setMobileNav(false)} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopBar onMenuClick={() => setMobileNav((v) => !v)} />
          <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">{children}</div>
          </main>
        </div>
      </div>
    </AdminProvider>
  );
}
