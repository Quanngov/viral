"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiSort } from "@/lib/search-query";

type Popover = "locale" | "filter" | "calendar" | null;

export type SearchSubmitPayload = {
  q: string;
  locale: (typeof locales)[number];
  period: (typeof periods)[number];
  sort: ApiSort;
};

type SearchToolbarProps = {
  searchCost: number;
  searching?: boolean;
  onSubmitSearch?: (payload: SearchSubmitPayload) => void;
};

function CoinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.5 2.5 1.5-1 1.75-2.5 1.75S9.5 13 9.5 14s1 1.5 2.5 1.5 2.5-.5 2.5-1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .53-.051 1.049-.147 1.548" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5" />
    </svg>
  );
}

const locales = ["Весь мир", "Русский", "Английский"] as const;
const periods = ["Сегодня", "Вчера", "Неделя", "Месяц", "Год", "Все время"] as const;

const SORT_OPTIONS: { label: string; value: ApiSort }[] = [
  { label: "Просмотры ↑", value: "views_asc" },
  { label: "Просмотры ↓", value: "views_desc" },
  { label: "Дата ↑", value: "date_asc" },
  { label: "Дата ↓", value: "date_desc" },
  { label: "Виральность ↑", value: "viral_asc" },
  { label: "Виральность ↓", value: "viral_desc" },
];

function menuRowClasses(active: boolean) {
  return active
    ? "border border-emerald-400 bg-emerald-50 font-semibold text-emerald-900 shadow-sm shadow-emerald-900/5"
    : "border border-transparent text-zinc-700 hover:bg-emerald-50/70 hover:text-emerald-900";
}

export function SearchToolbar({ searchCost, searching, onSubmitSearch }: SearchToolbarProps) {
  const [open, setOpen] = useState<Popover>(null);
  const [query, setQuery] = useState("");
  const [locale, setLocale] = useState<(typeof locales)[number]>(locales[0]);
  const [period, setPeriod] = useState<(typeof periods)[number]>("Неделя");
  const [sortSelection, setSortSelection] = useState<ApiSort>("viral_desc");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  function toggle(next: Popover) {
    setOpen((prev) => (prev === next ? null : next));
  }

  function submit() {
    const q = query.trim();
    if (!q || searching) return;
    onSubmitSearch?.({
      q,
      locale,
      period,
      sort: sortSelection,
    });
  }

  return (
    <div
      ref={rootRef}
      className="flex shrink-0 flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm shadow-zinc-900/5"
    >
      <div className="flex w-full min-w-0 items-center gap-3">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Поиск по теме</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="Введите тему, нишу или ключевое слово..."
            disabled={searching}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm text-zinc-900 outline-none ring-emerald-500/20 transition-all placeholder:text-zinc-400 focus:border-emerald-400 focus:bg-white focus:ring-4 disabled:opacity-60"
          />
        </label>

        <button
          type="button"
          onClick={submit}
          disabled={searching || !query.trim()}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50"
          title="Стоимость одного поиска (мок)"
        >
          <span className="tabular-nums">{searchCost}</span>
          <CoinIcon className="h-5 w-5 text-emerald-100" />
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle("locale");
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-800"
              aria-expanded={open === "locale"}
              aria-label="Язык и регион"
            >
              <GlobeIcon className="h-5 w-5" />
            </button>
            {open === "locale" ? (
              <div className="absolute right-0 z-40 mt-2 w-48 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg shadow-zinc-900/10">
                {locales.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setLocale(item);
                      setOpen(null);
                    }}
                    className={`flex w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${menuRowClasses(locale === item)}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle("filter");
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-800"
              aria-expanded={open === "filter"}
              aria-label="Сортировка"
            >
              <FilterIcon className="h-5 w-5" />
            </button>
            {open === "filter" ? (
              <div className="absolute right-0 z-40 mt-2 max-h-72 w-56 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-lg shadow-zinc-900/10">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSortSelection(opt.value);
                      setOpen(null);
                    }}
                    className={`flex w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${menuRowClasses(sortSelection === opt.value)}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle("calendar");
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-800"
              aria-expanded={open === "calendar"}
              aria-label="Период"
            >
              <CalendarIcon className="h-5 w-5" />
            </button>
            {open === "calendar" ? (
              <div className="absolute right-0 z-40 mt-2 w-48 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg shadow-zinc-900/10">
                {periods.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setPeriod(item);
                      setOpen(null);
                    }}
                    className={`flex w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${menuRowClasses(period === item)}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
