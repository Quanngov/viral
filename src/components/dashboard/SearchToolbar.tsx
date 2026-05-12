"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiSort, FeedPlatformMode } from "@/lib/search-query";

type Popover = "locale" | "filter" | "calendar" | "views" | null;

export type SearchSubmitPayload = {
  q: string;
  locale: (typeof locales)[number];
  period: (typeof periods)[number];
  sort: ApiSort;
  minViews: number;
  platform: FeedPlatformMode;
};

export type SearchFiltersPayload = Omit<SearchSubmitPayload, "q">;

type SearchToolbarProps = {
  searchCost: number;
  searching?: boolean;
  onSubmitSearch?: (payload: SearchSubmitPayload) => void;
  onFiltersChange?: (payload: SearchFiltersPayload) => void;
};

function LightningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13.75 2.75 6.5 13h4.75L10.25 21.25 17.5 11h-4.75l1-8.25Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 12h17M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18" />
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

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
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

const MIN_VIEWS_OPTIONS: { label: string; value: number }[] = [
  { label: "от 0", value: 0 },
  { label: "от 1 000", value: 1000 },
  { label: "от 10 000", value: 10000 },
  { label: "от 50 000", value: 50000 },
  { label: "от 100 000", value: 100000 },
  { label: "от 1 млн", value: 1000000 },
];

function menuRowClasses(active: boolean) {
  return active
    ? "border border-emerald-400 bg-emerald-50 font-semibold text-emerald-900 shadow-sm shadow-emerald-900/5"
    : "border border-transparent text-zinc-700 hover:bg-emerald-50/70 hover:text-emerald-900";
}

export function SearchToolbar({
  searchCost,
  searching,
  onSubmitSearch,
  onFiltersChange,
}: SearchToolbarProps) {
  const [open, setOpen] = useState<Popover>(null);
  const [query, setQuery] = useState("");
  const [locale, setLocale] = useState<(typeof locales)[number]>(locales[0]);
  const [period, setPeriod] = useState<(typeof periods)[number]>("Месяц");
  const [sortSelection, setSortSelection] = useState<ApiSort>("viral_desc");
  const [minViews, setMinViews] = useState<number>(0);
  const [platform, setPlatform] = useState<FeedPlatformMode>("all");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  useEffect(() => {
    onFiltersChange?.({
      locale,
      period,
      sort: sortSelection,
      minViews,
      platform,
    });
  }, [locale, period, sortSelection, minViews, platform, onFiltersChange]);

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
      minViews,
      platform,
    });
  }

  return (
    <div
      ref={rootRef}
      className="flex shrink-0 flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm shadow-zinc-900/5"
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
          <LightningIcon className="h-5 w-5 text-emerald-100" />
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
                <p className="px-2.5 pb-1 pt-1 text-xs font-medium text-zinc-800">Язык</p>
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
                <p className="px-2.5 pb-1 pt-1 text-xs font-medium text-zinc-800">Сортировка</p>
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
                <p className="px-2.5 pb-1 pt-1 text-xs font-medium text-zinc-800">Дата публикации</p>
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

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle("views");
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-800"
              aria-expanded={open === "views"}
              aria-label="Минимальные просмотры"
            >
              <EyeIcon className="h-5 w-5" />
            </button>
            {open === "views" ? (
              <div className="absolute right-0 z-40 mt-2 w-44 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg shadow-zinc-900/10">
                <p className="px-2.5 pb-1 pt-1 text-xs font-medium text-zinc-800">Просмотры</p>
                {MIN_VIEWS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setMinViews(opt.value);
                      setOpen(null);
                    }}
                    className={`flex w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${menuRowClasses(minViews === opt.value)}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-zinc-500">Площадка</span>
        {(
          [
            { id: "all" as const, label: "Все" },
            { id: "youtube" as const, label: "YouTube" },
            { id: "instagram" as const, label: "Instagram" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={searching}
            onClick={() => setPlatform(opt.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
              platform === opt.id
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50/60"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
