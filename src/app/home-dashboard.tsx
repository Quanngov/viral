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
          {/* Dashboard: фиксированная левая колонка + скролл справа */}
          <div className="flex h-dvh min-h-0 w-full overflow-hidden">
            
            {/* Левая колонка — не скроллится */}
            <aside className="z-20 hidden h-dvh w-[360px] shrink-0 flex-col gap-3 overflow-hidden bg-[#f4f5f7] py-2 pl-2 pr-3 lg:flex">
              
              {/* Карточка трендов */}
              <section className="min-h-0 flex-1 overflow-hidden">
                <LiveTrendsSidebar onVideoClick={setSelectedVideo} />
              </section>

              {/* Карточка профиля/кнопок */}
              <section className="shrink-0 overflow-visible">
                <UserPanel user={mockUser} activeView={activeView} onChangeView={setActiveView} />
              </section>

            </aside>

            {/* Основной контент — скроллится отдельно */}
            <main
              className={`min-h-0 min-w-0 flex-1 bg-transparent min-h-screen pb-[calc(4.5rem+env(safe-area-inset-bottom))] ${
                activeView === "scripts"
                  ? "overflow-y-auto lg:h-dvh lg:overflow-hidden lg:pb-3 sm:lg:pb-4"
                  : "overflow-y-auto lg:h-dvh lg:pb-12"
              }`}
            >
          {activeView === "home" ? (
            <>
              <LiveTrendsSidebar variant="mobile-horizontal" onVideoClick={setSelectedVideo} />
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
            <div className="flex min-h-0 flex-1 flex-col lg:h-full lg:overflow-hidden">
              <ScriptsSection />
            </div>
          )}

            </main>

          </div>

          {/* Мобильная навигация */}
          <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden">
            <UserPanel
              layout="bottom-nav"
              user={mockUser}
              activeView={activeView}
              onChangeView={setActiveView}
            />
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
