import type { ReactNode } from "react";
import { AdminStatusBadge } from "@/components/admin/shell/AdminStatusBadge";

type AdminPageHeaderProps = {
  title: string;
  description: string;
  status?: "live" | "preview";
  actions?: ReactNode;
};

export function AdminPageHeader({ title, description, status, actions }: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-zinc-200/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">{title}</h1>
          {status ? <AdminStatusBadge status={status} /> : null}
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-500">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
