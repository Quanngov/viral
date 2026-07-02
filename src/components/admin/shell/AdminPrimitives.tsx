import type { ReactNode } from "react";
import { AdminStatusBadge } from "@/components/admin/shell/AdminStatusBadge";

type AdminPreviewBannerProps = {
  title?: string;
  children?: ReactNode;
};

/** Shown on pages awaiting backend integration. */
export function AdminPreviewBanner({
  title = "Интерфейс готов · ожидает backend",
  children,
}: AdminPreviewBannerProps) {
  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <AdminStatusBadge status="preview" />
        <p className="text-sm font-medium text-amber-950">{title}</p>
      </div>
      {children ? (
        <p className="mt-2 text-sm leading-relaxed text-amber-900/80">{children}</p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-amber-900/80">
          UI и структура страницы готовы. Сохранение и мутации будут подключены, когда появятся admin API.
        </p>
      )}
    </div>
  );
}

type AdminStatProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  highlight?: boolean;
  small?: boolean;
};

export function AdminStat({ label, value, highlight, small }: AdminStatProps) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        highlight
          ? "border-emerald-200/80 bg-emerald-50/50"
          : "border-zinc-200/80 bg-white"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={`mt-0.5 font-semibold tabular-nums text-zinc-900 ${
          small ? "text-xs leading-snug" : "text-sm"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
