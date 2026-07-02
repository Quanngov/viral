"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_GROUPS, adminSectionFromPath } from "@/components/admin/shell/admin-nav-config";
import { useAdmin } from "@/components/admin/shell/AdminContext";
import { AdminStatusBadge } from "@/components/admin/shell/AdminStatusBadge";

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { href } = useAdmin();
  const active = adminSectionFromPath(pathname ?? "/admin");

  return (
    <aside className="flex h-full w-[15.5rem] shrink-0 flex-col border-r border-zinc-200/80 bg-white">
      <div className="border-b border-zinc-100 px-4 py-4">
        <Link href={href("/admin/overview")} className="group block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">ViralCloud</p>
          <p className="mt-0.5 text-sm font-semibold tracking-tight text-zinc-900 group-hover:text-emerald-900">
            Admin OS
          </p>
        </Link>
      </div>

      <nav className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-2 py-3" aria-label="Admin navigation">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = active === item.id;
                return (
                  <li key={item.id}>
                    <Link
                      href={href(item.href)}
                      onClick={onNavigate}
                      className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                        isActive
                          ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70"
                          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                      }`}
                      title={item.description}
                    >
                      <span className="truncate">{item.label}</span>
                      {item.status === "preview" && !isActive ? (
                        <span className="shrink-0 text-[9px] font-semibold uppercase text-amber-700/80">soon</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-zinc-100 px-4 py-3">
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Внутренняя панель управления платформой.{" "}
          <span className="text-zinc-400">Live</span> — данные из API.{" "}
          <span className="text-zinc-400">Preview</span> — UI без мутаций.
        </p>
      </div>
    </aside>
  );
}

export function AdminTopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const active = adminSectionFromPath(pathname ?? "/admin");
  const section = ADMIN_NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === active);

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200/80 bg-zinc-50/80 px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 lg:hidden"
          aria-label="Меню"
        >
          ≡
        </button>
        <span className="text-zinc-400">Admin</span>
        <span className="text-zinc-300">/</span>
        <span className="truncate font-medium text-zinc-800">{section?.label ?? "Обзор"}</span>
        {section ? <AdminStatusBadge status={section.status} /> : null}
      </div>
      <p className="hidden text-xs text-zinc-500 sm:block">Операционная система ViralCloud</p>
    </div>
  );
}
