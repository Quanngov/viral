"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/components/admin/shell/AdminContext";
import { ADMIN_NAV_GROUPS } from "@/components/admin/shell/admin-nav-config";
import { AdminInfoTip } from "@/components/admin/shell/AdminInfoTip";
import { AdminPageHeader } from "@/components/admin/shell/AdminPageHeader";
import { AdminStat } from "@/components/admin/shell/AdminPrimitives";
import { formatDt } from "@/components/admin/admin-utils";

type StatsPayload = {
  totalVideos: number;
  youtubeCount: number;
  instagramCount: number;
  avgScore: number | null;
  maxViews: number;
  lastActivityAt: string | null;
};

type ApiHealth = {
  tikhub: string;
  youtube: string;
  deepseek: string;
  groq: string;
  database: string;
};

export function AdminOverviewPage() {
  const { appendKey, href } = useAdmin();
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [health, setHealth] = useState<ApiHealth | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [sr, hr] = await Promise.all([
          fetch(appendKey("/api/admin/stats")),
          fetch(appendKey("/api/admin/health")),
        ]);
        if (sr.ok) setStats((await sr.json()) as StatsPayload);
        if (hr.ok) setHealth((await hr.json()) as ApiHealth);
      } catch {
        /* optional */
      }
    })();
  }, [appendKey]);

  const liveSections = ADMIN_NAV_GROUPS.flatMap((g) => g.items).filter((i) => i.status === "live");

  return (
    <div className="space-y-8">
      <AdminPageHeader
        status="live"
        title="Обзор платформы"
        description="Операционная сводка ViralCloud: контент, провайдеры и быстрый доступ к live-разделам."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Всего роликов" value={stats?.totalVideos ?? "—"} highlight />
        <AdminStat label="YouTube" value={stats?.youtubeCount ?? "—"} />
        <AdminStat label="Instagram" value={stats?.instagramCount ?? "—"} />
        <AdminStat
          label="Последняя активность"
          value={stats ? formatDt(stats.lastActivityAt) : "—"}
          small
        />
      </section>

      {health ? (
        <section className="rounded-xl border border-zinc-200/80 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            Провайдеры
            <AdminInfoTip text="Показывает только наличие ключей в env — значения никогда не отображаются." />
          </h2>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
            {(
              [
                ["TikHub", health.tikhub],
                ["YouTube", health.youtube],
                ["DeepSeek", health.deepseek],
                ["Groq", health.groq],
                ["Database", health.database],
              ] as const
            ).map(([name, status]) => (
              <li
                key={name}
                className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2"
              >
                <span className="font-medium text-zinc-700">{name}</span>
                <span
                  className={`text-xs font-semibold ${
                    status === "connected" ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {status === "connected" ? "OK" : "missing"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Live-разделы</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {liveSections
            .filter((s) => s.id !== "overview")
            .map((section) => (
              <Link
                key={section.id}
                href={href(section.href)}
                className="rounded-xl border border-zinc-200/80 bg-white p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50/30"
              >
                <p className="font-semibold text-zinc-900">{section.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{section.description}</p>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
