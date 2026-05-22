import type { ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-[#f4f5f7] font-sans text-zinc-900">
      <div className="h-full min-h-0 min-w-0 max-w-[100vw] overflow-hidden">{children}</div>
    </div>
  );
}
