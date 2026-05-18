import type { ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f4f5f7] font-sans text-zinc-900">
      <div className="min-h-screen min-w-0 max-w-[100vw] overflow-x-hidden">{children}</div>
    </div>
  );
}
