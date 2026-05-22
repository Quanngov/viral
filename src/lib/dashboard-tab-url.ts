import type { DashboardView } from "@/components/dashboard/UserPanel";

export function tabQueryToView(tab: string | null): DashboardView {
  if (tab === "competitors") return "competitors";
  if (tab === "saved") return "saved";
  if (tab === "scripts") return "scripts";
  if (tab === "search") return "home";
  return "home";
}

export function viewToTabQuery(view: DashboardView): string {
  if (view === "competitors") return "competitors";
  if (view === "saved") return "saved";
  if (view === "scripts") return "scripts";
  return "home";
}

export function readViewFromLocation(): DashboardView {
  if (typeof window === "undefined") return "home";
  return tabQueryToView(new URLSearchParams(window.location.search).get("tab"));
}

/** Updates URL without Next.js navigation (avoids SSR refetch on tab switch). */
export function replaceDashboardTabUrl(view: DashboardView): void {
  if (typeof window === "undefined") return;
  const q = new URLSearchParams(window.location.search);
  const next = viewToTabQuery(view);
  if (next === "home") q.delete("tab");
  else q.set("tab", next);
  const qs = q.toString();
  const url = qs ? `/?${qs}` : "/";
  window.history.replaceState(window.history.state, "", url);
}
