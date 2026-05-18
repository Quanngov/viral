"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CompetitorSpySection } from "@/components/dashboard/CompetitorSpySection";
import { LiveTrendsSidebar } from "@/components/dashboard/LiveTrendsSidebar";
import { SavedVideosProvider } from "@/components/dashboard/SavedVideosContext";
import { ToastProvider } from "@/components/dashboard/ToastContext";
import { SavedVideosSection } from "@/components/dashboard/SavedVideosSection";
import { SearchResultsSection } from "@/components/dashboard/SearchResultsSection";
import { VideoDetailPanel } from "@/components/dashboard/VideoDetailPanel";
import { ScriptsSection } from "@/components/dashboard/ScriptsSection";
import { UserPanel, type DashboardView } from "@/components/dashboard/UserPanel";
import { WeeklyTrendsSection } from "@/components/dashboard/WeeklyTrendsSection";
import type { GridVideo } from "@/lib/mock-data";
import { mockUser, mockWeeklyTrends } from "@/lib/mock-data";

function tabQueryToView(tab: string | null): DashboardView {
  if (tab === "competitors") return "competitors";
  if (tab === "saved") return "saved";
  if (tab === "scripts") return "scripts";
  if (tab === "search") return "home";
  return "home";
}

function viewToTabQuery(view: DashboardView): string {
  if (view === "competitors") return "competitors";
  if (view === "saved") return "saved";
  if (view === "scripts") return "scripts";
  return "home";
}

function HomeDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [weeklyOpen, setWeeklyOpen] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<GridVideo | null>(null);

  const activeView = useMemo(() => tabQueryToView(searchParams.get("tab")), [searchParams]);

  const setActiveView = useCallback(
    (view: DashboardView) => {
      const next = viewToTabQuery(view);
      const q = new URLSearchParams(searchParams.toString());
      if (next === "home") {
        q.delete("tab");
      } else {
        q.set("tab", next);
      }
      const qs = q.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && !["home", "competitors", "saved", "search", "scripts"].includes(tab)) {
      const q = new URLSearchParams(searchParams.toString());
      q.delete("tab");
      const qs = q.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    }
  }, [router, searchParams]);

  return (
    <ToastProvider>
      <SavedVideosProvider>
        <DashboardLayout>
          {/* Dashboard grid - левая sticky колонка + основной контент */}
          <div className="grid grid-cols-[320px_minmax(0,1fr)] items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            
            {/* Левая sticky колонка */}
            <aside className="z-20 hidden h-[calc(100dvh-16px)] flex-col gap-3 self-start overflow-hidden lg:sticky lg:top-2 lg:flex">
              
              {/* Карточка трендов */}
              <section className="min-h-0 flex-1 overflow-hidden">
                <LiveTrendsSidebar onVideoClick={setSelectedVideo} />
              </section>

              {/* Карточка профиля/кнопок */}
              <section className="shrink-0 overflow-visible">
                <UserPanel user={mockUser} activeView={activeView} onChangeView={setActiveView} />
              </section>

            </aside>

            {/* Основной контент */}
            <main
              className={`flex min-h-0 min-w-0 flex-1 flex-col bg-transparent ${
                activeView === "scripts"
                  ? "h-[100dvh] max-h-[100dvh] overflow-hidden pb-3 sm:pb-4"
                  : "pb-12"
              }`}
            >
          {activeView === "home" ? (
            <>
              <WeeklyTrendsSection
                trends={mockWeeklyTrends}
                open={weeklyOpen}
                onToggle={() => setWeeklyOpen((v) => !v)}
              />
              <div className="mt-0 flex flex-col gap-3 px-6">
                <SearchResultsSection searchCost={5} onVideoClick={setSelectedVideo} />
              </div>
            </>
          ) : activeView === "competitors" ? (
            <CompetitorSpySection onVideoClick={setSelectedVideo} />
          ) : activeView === "saved" ? (
            <SavedVideosSection isActive onVideoClick={setSelectedVideo} />
          ) : (
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
              <ScriptsSection />
            </div>
          )}

            </main>

          </div>

          {/* Мобильная навигация */}
          <div className="border-t border-zinc-200 bg-white lg:hidden">
            <UserPanel user={mockUser} activeView={activeView} onChangeView={setActiveView} />
          </div>

        <VideoDetailPanel
          video={selectedVideo}
          activeView={activeView}
          onClose={() => setSelectedVideo(null)}
        />
      </DashboardLayout>
      </SavedVideosProvider>
    </ToastProvider>
  );
}

export function HomeDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">Загрузка…</div>
      }
    >
      <HomeDashboardInner />
    </Suspense>
  );
}
