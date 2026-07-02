"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/shell/AdminContext";
import { AdminInfoTip } from "@/components/admin/shell/AdminInfoTip";
import { AdminPageHeader } from "@/components/admin/shell/AdminPageHeader";
import { formatDt } from "@/components/admin/admin-utils";

export type TrendQueueItem = {
  id: string;
  videoId: string;
  status: string;
  trendScore: number;
  reason: string | null;
  source: string | null;
  detectedAt: string;
  releaseAt: string | null;
  publishedAt: string | null;
  video: {
    title: string;
    platform: string;
    authorUsername: string | null;
    views: number;
    rating: number;
    publishedAt: string;
  };
};

function AdminTrendsQueue() {
  const { appendKey } = useAdmin();
  const [trends, setTrends] = useState<TrendQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    async function loadTrends() {
      try {
        const response = await fetch(appendKey("/api/admin/trends"));
        const data = await response.json();
        if (Array.isArray(data.trends)) setTrends(data.trends);
      } catch (error) {
        console.error("Failed to load trends queue:", error);
      } finally {
        setLoading(false);
      }
    }
    void loadTrends();
  }, [appendKey]);

  const filteredTrends = useMemo(() => {
    if (filter === "all") return trends;
    return trends.filter((t) => t.status === filter);
  }, [trends, filter]);

  const statusCounts = useMemo(() => {
    const counts = { queued: 0, published: 0, archived: 0, rejected: 0 };
    trends.forEach((t) => {
      if (t.status in counts) counts[t.status as keyof typeof counts]++;
    });
    return counts;
  }, [trends]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        status="live"
        title="Realtime Trends"
        description="Очередь кандидатов в ленту «Тренды в реальном времени». Публикация — max 1 за poll."
      />

      <section className="rounded-xl border border-zinc-200/80 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Очередь TrendItem
              <AdminInfoTip text="При каждом GET /api/trends/realtime публикуется максимум 1 queued элемент с releaseAt ≤ now. Сортировка в ленте — publishedAt desc." />
            </h2>
            <p className="mt-1 text-xs text-zinc-500">Данные из /api/admin/trends · до 100 записей</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(statusCounts).map(([status, count]) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(filter === status ? "all" : status)}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  filter === status
                    ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {status}: {count}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-center text-sm text-zinc-500">Загрузка очереди…</p>
        ) : filteredTrends.length === 0 ? (
          <p className="mt-6 text-center text-sm text-zinc-500">
            {filter === "all" ? "Очередь пуста" : `Нет элементов со статусом «${filter}»`}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200/80">
            <table className="w-full min-w-[960px] text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/90 text-left">
                  <th className="px-2 py-2 font-semibold text-zinc-600">Статус</th>
                  <th className="px-2 py-2 font-semibold text-zinc-600">Балл</th>
                  <th className="px-2 py-2 font-semibold text-zinc-600">Причина</th>
                  <th className="px-2 py-2 font-semibold text-zinc-600">Платформа</th>
                  <th className="px-2 py-2 font-semibold text-zinc-600">Заголовок</th>
                  <th className="px-2 py-2 font-semibold text-zinc-600">Просмотры</th>
                  <th className="px-2 py-2 font-semibold text-zinc-600">
                    Release
                    <AdminInfoTip text="Задержка discovery delay: queued элементы получают releaseAt +5…+25 мин от detectedAt." />
                  </th>
                  <th className="px-2 py-2 font-semibold text-zinc-600">Обнаружен</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrends.map((trend) => (
                  <tr key={trend.id} className="border-b border-zinc-100 hover:bg-zinc-50/80">
                    <td className="px-2 py-2">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          trend.status === "queued"
                            ? "bg-amber-100 text-amber-900"
                            : trend.status === "published"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {trend.status}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-medium tabular-nums">{trend.trendScore}</td>
                    <td className="max-w-[140px] truncate px-2 py-2" title={trend.reason ?? ""}>
                      {trend.reason ?? "—"}
                    </td>
                    <td className="px-2 py-2">{trend.video.platform}</td>
                    <td className="max-w-[220px] truncate px-2 py-2 font-medium" title={trend.video.title}>
                      {trend.video.title}
                    </td>
                    <td className="px-2 py-2 tabular-nums">{trend.video.views.toLocaleString("ru-RU")}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {trend.publishedAt
                        ? formatDt(trend.publishedAt)
                        : trend.releaseAt
                          ? formatDt(trend.releaseAt)
                          : "—"}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">{formatDt(trend.detectedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function AdminTrendsPage() {
  return <AdminTrendsQueue />;
}
