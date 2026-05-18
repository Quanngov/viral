"use client";

import type { WeeklyTrend } from "@/lib/mock-data";
import { WeeklyTrendCard } from "./WeeklyTrendCard";

type WeeklyTrendsSectionProps = {
  trends: WeeklyTrend[];
  open: boolean;
  onToggle: () => void;
};

export function WeeklyTrendsSection({ trends, open, onToggle }: WeeklyTrendsSectionProps) {
  return (
    <section className={`rounded-2xl bg-transparent px-6 pt-3 ${open ? "pb-2" : "pb-1"}`}>
      <header className="mb-0 flex shrink-0 items-center gap-3">
        <h2 className="text-base font-semibold tracking-tight text-zinc-900">Тренды недели</h2>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-800"
          aria-expanded={open}
          aria-label={open ? "Скрыть тренды недели" : "Показать тренды недели"}
        >
          <span>{open ? "Скрыть" : "Посмотреть"}</span>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" aria-hidden>
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 15 6-6 6 6" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
            )}
          </svg>
        </button>
      </header>
      {open ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {trends.map((trend) => (
            <WeeklyTrendCard key={trend.id} trend={trend} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
