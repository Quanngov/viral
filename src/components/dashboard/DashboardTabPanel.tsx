"use client";

import type { ReactNode } from "react";

type DashboardTabPanelProps = {
  active: boolean;
  children: ReactNode;
  className?: string;
};

/** Keeps children mounted; inactive tabs use `hidden` (no layout/scroll bleed). */
export function DashboardTabPanel({ active, children, className = "" }: DashboardTabPanelProps) {
  return (
    <div
      className={`dashboard-ease min-h-0 ${active ? "block" : "hidden"} ${className}`}
      aria-hidden={!active}
    >
      {children}
    </div>
  );
}
