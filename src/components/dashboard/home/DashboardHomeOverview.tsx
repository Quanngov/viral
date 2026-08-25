"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardHomePayload } from "@/lib/dashboard-home-types";
import {
  loadDashboardHome,
  peekDashboardHomeCache,
} from "@/lib/dashboard-home-client";
import { DashboardSocialCards } from "@/components/dashboard/home/DashboardSocialCards";
import { DashboardActivityRings } from "@/components/dashboard/home/DashboardActivityRings";
import { DashboardAiTasks } from "@/components/dashboard/home/DashboardAiTasks";

import "./dashboard-home-panel.css";

type DashboardHomeOverviewProps = {
  active: boolean;
  onOpenProfile?: () => void;
};

function OverviewSkeleton() {
  return (
    <div className="dashboard-home-skeleton" aria-hidden>
      <div className="dashboard-home-skeleton__ring skeleton-breathe skeleton-shimmer" />
      <div className="dashboard-home-skeleton__col">
        <div className="dashboard-home-skeleton__row skeleton-breathe skeleton-shimmer" />
        <div className="dashboard-home-skeleton__row skeleton-breathe skeleton-shimmer" />
        <div className="dashboard-home-skeleton__row skeleton-breathe skeleton-shimmer" />
      </div>
      <div className="dashboard-home-skeleton__ai skeleton-breathe skeleton-shimmer" />
    </div>
  );
}

const EMPTY_CONNECTION = {
  method: null,
  status: "disconnected" as const,
  oauthAvailable: false,
  connectPath: "",
};

const EMPTY_HOME: DashboardHomePayload = {
  socialAccounts: [
    {
      platform: "instagram",
      connected: false,
      username: "",
      avatarUrl: "",
      followers: null,
      followersTrend: null,
      monthlyViews: null,
      monthlyViewsTrend: null,
      connection: { ...EMPTY_CONNECTION, connectPath: "/api/social/oauth/instagram/start" },
    },
    {
      platform: "tiktok",
      connected: false,
      username: "",
      avatarUrl: "",
      followers: null,
      followersTrend: null,
      monthlyViews: null,
      monthlyViewsTrend: null,
      connection: { ...EMPTY_CONNECTION, connectPath: "/api/social/oauth/tiktok/start" },
    },
    {
      platform: "youtube",
      connected: false,
      username: "",
      avatarUrl: "",
      followers: null,
      followersTrend: null,
      monthlyViews: null,
      monthlyViewsTrend: null,
      connection: { ...EMPTY_CONNECTION, connectPath: "/api/social/oauth/youtube/start" },
    },
  ],
  totals: { followers: 0, monthlyViews: 0 },
  activityRings: [
    { id: "videos", label: "Ролики опубликованы", current: 0, goal: 12, color: "#e11d48" },
    { id: "views", label: "Просмотры получены", current: 0, goal: 100_000, color: "#059669" },
    { id: "growth", label: "Рост подписчиков", current: 0, goal: 500, color: "#0891b2" },
  ],
  monthlyTasks: [],
};

export function DashboardHomeOverview({ active, onOpenProfile }: DashboardHomeOverviewProps) {
  const [home, setHome] = useState<DashboardHomePayload | null>(() => peekDashboardHomeCache());
  const [loading, setLoading] = useState(() => !peekDashboardHomeCache());

  const load = useCallback(async () => {
    try {
      const { data } = await loadDashboardHome();
      setHome(data);
    } catch {
      setHome((prev) => prev ?? EMPTY_HOME);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    void load();
  }, [active, load]);

  useEffect(() => {
    const onInvalidate = () => {
      if (active) void load();
    };
    window.addEventListener("viral:dashboard-home-invalidate", onInvalidate);
    return () => window.removeEventListener("viral:dashboard-home-invalidate", onInvalidate);
  }, [active, load]);

  if (!active) return null;

  const data = home ?? EMPTY_HOME;

  return (
    <section className="dashboard-home-section rounded-2xl bg-transparent px-6 pt-5 pb-2">
      {loading && !home ? (
        <OverviewSkeleton />
      ) : (
        <div className="dashboard-home-scroll scrollbar-hidden overflow-x-auto">
          <div className="dashboard-home-panel dashboard-home-enter">
            <div className="dashboard-home-panel__scroll">
              <div className="dashboard-home-panel__zone dashboard-home-panel__zone--rings">
                <DashboardActivityRings rings={data.activityRings} />
              </div>
              <div className="dashboard-home-panel__zone dashboard-home-panel__zone--social">
                <DashboardSocialCards accounts={data.socialAccounts} onConnectManual={onOpenProfile} />
              </div>
              <div className="dashboard-home-panel__zone dashboard-home-panel__zone--ai">
                <DashboardAiTasks tasks={data.monthlyTasks} />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
