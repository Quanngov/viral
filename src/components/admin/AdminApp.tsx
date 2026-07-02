"use client";

import type { AdminSectionId } from "@/components/admin/shell/admin-nav-config";
import { AdminOverviewPage } from "@/components/admin/pages/AdminOverviewPage";
import { AdminVideosPage } from "@/components/admin/pages/AdminVideosPage";
import { AdminBillingPage } from "@/components/admin/pages/AdminBillingPage";
import { AdminLogsPage } from "@/components/admin/pages/AdminLogsPage";
import { AdminTrendsPage } from "@/components/admin/pages/AdminTrendsPage";
import { AdminPromptManagerPage } from "@/components/admin/pages/AdminPromptManagerPage";
import { AdminPlansPage, AdminTokensPage } from "@/components/admin/pages/AdminPlansPage";
import {
  AdminAiModelsPage,
  AdminAnalyticsPage,
  AdminHealthPage,
  AdminProvidersPage,
} from "@/components/admin/pages/AdminSystemPages";
import {
  AdminApiKeysPage,
  AdminCostsPage,
  AdminDiscoveryPage,
  AdminErrorsPage,
  AdminFlagsPage,
  AdminJobsPage,
  AdminMonitoringPage,
  AdminQueuesPage,
  AdminScrapersPage,
  AdminSearchSettingsPage,
  AdminSettingsPage,
  AdminSubscriptionsPage,
  AdminUsersPage,
  AdminVideoProcessingPage,
} from "@/components/admin/pages/AdminPreviewPages";

type AdminAppProps = {
  section: AdminSectionId;
};

export function AdminApp({ section }: AdminAppProps) {
  switch (section) {
    case "overview":
      return <AdminOverviewPage />;
    case "analytics":
      return <AdminAnalyticsPage />;
    case "users":
      return <AdminUsersPage />;
    case "subscriptions":
      return <AdminSubscriptionsPage />;
    case "plans":
      return <AdminPlansPage />;
    case "tokens":
      return <AdminTokensPage />;
    case "billing":
      return <AdminBillingPage />;
    case "costs":
      return <AdminCostsPage />;
    case "videos":
      return <AdminVideosPage />;
    case "video-processing":
      return <AdminVideoProcessingPage />;
    case "scrapers":
      return <AdminScrapersPage />;
    case "ai-models":
      return <AdminAiModelsPage />;
    case "prompts":
      return <AdminPromptManagerPage />;
    case "search":
      return <AdminSearchSettingsPage />;
    case "trends":
      return <AdminTrendsPage />;
    case "discovery":
      return <AdminDiscoveryPage />;
    case "queues":
      return <AdminQueuesPage />;
    case "jobs":
      return <AdminJobsPage />;
    case "providers":
      return <AdminProvidersPage />;
    case "logs":
      return <AdminLogsPage />;
    case "errors":
      return <AdminErrorsPage />;
    case "monitoring":
      return <AdminMonitoringPage />;
    case "health":
      return <AdminHealthPage />;
    case "api-keys":
      return <AdminApiKeysPage />;
    case "flags":
      return <AdminFlagsPage />;
    case "settings":
      return <AdminSettingsPage />;
    default:
      return <AdminOverviewPage />;
  }
}
