import { HomeDashboard } from "@/app/home-dashboard";
import { fetchDashboardInitialPayload } from "@/lib/dashboard-server-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initial = await fetchDashboardInitialPayload();
  return <HomeDashboard initial={initial} />;
}
