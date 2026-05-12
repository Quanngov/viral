"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CompetitorSpySection } from "@/components/dashboard/CompetitorSpySection";
import { LiveTrendsSidebar } from "@/components/dashboard/LiveTrendsSidebar";
import { SavedVideosProvider } from "@/components/dashboard/SavedVideosContext";
import { SavedVideosSection } from "@/components/dashboard/SavedVideosSection";
import { SearchResultsSection } from "@/components/dashboard/SearchResultsSection";
import { VideoDetailPanel } from "@/components/dashboard/VideoDetailPanel";
import { UserPanel, type DashboardView } from "@/components/dashboard/UserPanel";
import { WeeklyTrendsSection } from "@/components/dashboard/WeeklyTrendsSection";
import type { GridVideo } from "@/lib/mock-data";
import { mockUser, mockWeeklyTrends } from "@/lib/mock-data";

export default function Home() {
  const [weeklyOpen, setWeeklyOpen] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<GridVideo | null>(null);
  const [activeView, setActiveView] = useState<DashboardView>("home");

  return (
    <SavedVideosProvider>
      <DashboardLayout>
        <div className="sticky top-0 flex h-[100dvh] min-h-0 w-[25%] min-w-[272px] max-w-[380px] shrink-0 flex-col overflow-hidden bg-transparent">
          <LiveTrendsSidebar onVideoClick={setSelectedVideo} />
          <UserPanel user={mockUser} activeView={activeView} onChangeView={setActiveView} />
        </div>

        <div className="min-w-0 flex-1 bg-transparent pb-12 pt-0">
          {activeView === "home" ? (
            <>
              <WeeklyTrendsSection
                trends={mockWeeklyTrends}
                open={weeklyOpen}
                onToggle={() => setWeeklyOpen((v) => !v)}
              />
              <div className={`${weeklyOpen ? "mt-3" : "mt-1.5"} flex flex-col gap-3 px-6`}>
                <SearchResultsSection searchCost={5} onVideoClick={setSelectedVideo} />
              </div>
            </>
          ) : activeView === "competitors" ? (
            <CompetitorSpySection onVideoClick={setSelectedVideo} />
          ) : (
            <SavedVideosSection isActive={activeView === "saved"} onVideoClick={setSelectedVideo} />
          )}
        </div>
        <VideoDetailPanel video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      </DashboardLayout>
    </SavedVideosProvider>
  );
}
