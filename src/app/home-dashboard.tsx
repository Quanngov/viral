"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CompetitorSpySection } from "@/components/dashboard/CompetitorSpySection";
import { LiveTrendsSidebar } from "@/components/dashboard/LiveTrendsSidebar";
import { SavedVideosProvider } from "@/components/dashboard/SavedVideosContext";
import { ToastProvider } from "@/components/dashboard/ToastContext";
import { SavedVideosSection } from "@/components/dashboard/SavedVideosSection";
import { SearchResultsSection } from "@/components/dashboard/SearchResultsSection";
import { VideoDetailPanel } from "@/components/dashboard/VideoDetailPanel";
import { ScriptsSection } from "@/components/dashboard/ScriptsSection";
import { AuthSessionProvider } from "@/components/dashboard/AuthSessionProvider";
import { UserPanel, type DashboardView } from "@/components/dashboard/UserPanel";
import { DashboardTabPanel } from "@/components/dashboard/DashboardTabPanel";
import { WeeklyTrendsSection } from "@/components/dashboard/WeeklyTrendsSection";
import type { DashboardInitialPayload } from "@/lib/dashboard-initial";
import type { GridVideo } from "@/lib/mock-data";
import { mockWeeklyTrends } from "@/lib/mock-data";
import { loadSavedMap, loadSavedVideosList, seedDashboardFromSsr } from "@/lib/dashboard-fetch";
import { readViewFromLocation, replaceDashboardTabUrl } from "@/lib/dashboard-tab-url";

const VALID_TABS = new Set(["home", "competitors", "saved", "search", "scripts"]);

/** Stagger non-critical API work to protect Supabase pool (free tier). */
const SAVED_MAP_MS = 12_000;
const SAVED_LIST_MS = 18_000;

function HomeDashboardInner({ initial }: { initial: DashboardInitialPayload }) {
  const [activeView, setActiveViewState] = useState<DashboardView>("home");
  const [weeklyOpen, setWeeklyOpen] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<GridVideo | null>(null);

  useEffect(() => {
    const view = readViewFromLocation();
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab && !VALID_TABS.has(tab)) {
      replaceDashboardTabUrl("home");
      setActiveViewState("home");
      return;
    }
    setActiveViewState(view);
  }, []);

  useEffect(() => {
    const onPopState = () => setActiveViewState(readViewFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const setActiveView = useCallback((view: DashboardView) => {
    setActiveViewState(view);
    replaceDashboardTabUrl(view);
  }, []);

  useEffect(() => {
    seedDashboardFromSsr(initial);
  }, [initial]);

  useEffect(() => {
    const t1 = window.setTimeout(() => void loadSavedMap(), SAVED_MAP_MS);
    const t2 = window.setTimeout(() => void loadSavedVideosList(), SAVED_LIST_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <AuthSessionProvider>
    <ToastProvider>
      <SavedVideosProvider>
        <DashboardLayout>
          <div className="flex h-dvh min-h-0 w-full overflow-hidden">
            <aside className="z-20 hidden h-dvh w-[360px] shrink-0 flex-col gap-3 overflow-hidden bg-[#f4f5f7] py-2 pl-2 pr-3 lg:flex">
              <section className="min-h-0 flex-1 overflow-hidden">
                <LiveTrendsSidebar initial={initial} onVideoClick={setSelectedVideo} />
              </section>
              <section className="shrink-0 overflow-visible">
                <UserPanel activeView={activeView} onChangeView={setActiveView} />
              </section>
            </aside>

            <main
              className={`min-h-0 min-w-0 flex-1 overflow-y-auto bg-transparent pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:h-dvh lg:max-h-dvh ${
                activeView === "scripts"
                  ? "lg:overflow-hidden lg:pb-3 sm:lg:pb-4"
                  : "lg:pb-12"
              }`}
            >
          <DashboardTabPanel active={activeView === "home"}>
            <LiveTrendsSidebar variant="mobile-horizontal" initial={initial} onVideoClick={setSelectedVideo} />
            <WeeklyTrendsSection
              trends={mockWeeklyTrends}
              open={weeklyOpen}
              onToggle={() => setWeeklyOpen((v) => !v)}
            />
            <div className="mt-0 flex flex-col gap-3 px-6">
              <SearchResultsSection
                searchCost={5}
                initialHome={initial}
                onVideoClick={setSelectedVideo}
              />
            </div>
          </DashboardTabPanel>

          <DashboardTabPanel active={activeView === "competitors"}>
            <CompetitorSpySection active={activeView === "competitors"} onVideoClick={setSelectedVideo} />
          </DashboardTabPanel>

          <DashboardTabPanel active={activeView === "saved"}>
            <SavedVideosSection isActive={activeView === "saved"} onVideoClick={setSelectedVideo} />
          </DashboardTabPanel>

          <DashboardTabPanel
            active={activeView === "scripts"}
            className="flex min-h-0 flex-1 flex-col lg:h-full lg:overflow-hidden"
          >
            <ScriptsSection active={activeView === "scripts"} />
          </DashboardTabPanel>
            </main>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden">
            <UserPanel layout="bottom-nav" activeView={activeView} onChangeView={setActiveView} />
          </div>

        <VideoDetailPanel
          video={selectedVideo}
          activeView={activeView}
          onClose={() => setSelectedVideo(null)}
        />
      </DashboardLayout>
      </SavedVideosProvider>
    </ToastProvider>
    </AuthSessionProvider>
  );
}

type HomeDashboardProps = {
  initial: DashboardInitialPayload;
};

export function HomeDashboard({ initial }: HomeDashboardProps) {
  return <HomeDashboardInner initial={initial} />;
}
