"use client";

import { useState } from "react";
import type { WeeklyTrend } from "@/lib/mock-data";
import { WeeklyTrendCard } from "./WeeklyTrendCard";

type WeeklyTrendsSectionProps = {
  trends: WeeklyTrend[];
};

export function WeeklyTrendsSection({ trends }: WeeklyTrendsSectionProps) {
  const [open, setOpen] = useState(true);

  return (
    <section className="rounded-2xl bg-transparent px-6 pb-4 pt-3">
      <header className="mb-3 flex shrink-0 items-center justify-between gap-4">
        <h2 className="text-base font-semibold tracking-tight text-zinc-900">
          Тренды недели
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-xs font-medium text-emerald-700 transition-colors hover:text-emerald-900"
          >
            Смотреть все
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-800"
            aria-expanded={open}
            aria-label={open ? "Скрыть тренды недели" : "Показать тренды недели"}
          >
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${open ? "" : "rotate-180"}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </button>
        </div>
      </header>
      {open ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {trends.map((trend) => (
            <WeeklyTrendCard key={trend.id} trend={trend} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
