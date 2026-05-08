import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LiveTrendsSidebar } from "@/components/dashboard/LiveTrendsSidebar";
import { SearchResultsSection } from "@/components/dashboard/SearchResultsSection";
import { UserPanel } from "@/components/dashboard/UserPanel";
import { WeeklyTrendsSection } from "@/components/dashboard/WeeklyTrendsSection";
import { mockUser, mockWeeklyTrends } from "@/lib/mock-data";

export default function Home() {
  return (
    <DashboardLayout>
      <div className="sticky top-0 flex h-[100dvh] min-h-0 w-[25%] min-w-[272px] max-w-[380px] shrink-0 flex-col overflow-hidden border-r border-zinc-200/80 bg-white">
        <LiveTrendsSidebar />
        <UserPanel user={mockUser} />
      </div>

      <div className="min-w-0 flex-1 pb-12 pt-5">
        <WeeklyTrendsSection trends={mockWeeklyTrends} />
        <div className="mt-5 flex flex-col gap-5 px-6">
          <SearchResultsSection searchCost={5} />
        </div>
      </div>
    </DashboardLayout>
  );
}
