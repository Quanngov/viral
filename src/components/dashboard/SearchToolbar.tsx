"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ApiSort, FeedPlatformMode } from "@/lib/search-query";
import { buildPopularQueryPool } from "@/lib/popular-search-queries";

type Popover = "locale" | "filter" | "calendar" | "views" | null;

/** Number of query chips shown (a random subset picked once per page load). */
const CHIP_COUNT = 6;

// Placeholder typing timing — deliberately calm, no rush.
const TYPE_START_MS = 600;
const TYPE_CHAR_MS = 95;
const PAUSE_FULL_MS = 2600;
const DELETE_CHAR_MS = 55;
const PAUSE_NEXT_MS = 700;

/** Random subset of the pool (stable for the lifetime of one page load). */
function pickRandomChips(pool: string[], count: number): string[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

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
  /** Real popular search queries from the server; empty when not provided. */
  popularSearchTopics?: string[];
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
  popularSearchTopics = [],
  onSubmitSearch,
  onFiltersChange,
}: SearchToolbarProps) {
  const [open, setOpen] = useState<Popover>(null);
  const [query, setQuery] = useState("");
  const [locale, setLocale] = useState<(typeof locales)[number]>(locales[0]);
  const [period, setPeriod] = useState<(typeof periods)[number]>("Месяц");
  const [sortSelection, setSortSelection] = useState<ApiSort>("viral_desc");
  const [minViews, setMinViews] = useState<number>(0);
  const platform: FeedPlatformMode = "all";
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Shared pool for chips + animated placeholder: real server topics first,
  // isolated fallback appended so the UI never looks empty.
  const queryPool = useMemo(
    () => buildPopularQueryPool(popularSearchTopics),
    [popularSearchTopics],
  );

  // Random subset per page load, stable while the page is open. SSR/hydration-safe:
  // default = first N, then re-pick once on the client after mount.
  const [chips, setChips] = useState<string[]>(() => queryPool.slice(0, CHIP_COUNT));
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setChips(pickRandomChips(queryPool, CHIP_COUNT));
    });
    return () => window.cancelAnimationFrame(raf);
  }, [queryPool]);

  // Single-row chips: render only chips that fully fit the available width
  // (never clip a chip mid-way); recompute when the set or container resizes.
  const chipsRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(chips.length);
  useEffect(() => {
    const el = chipsRef.current;
    if (!el) return;
    const compute = () => {
      const containerRect = el.getBoundingClientRect();
      let count = 0;
      for (const child of Array.from(el.children)) {
        const rect = (child as HTMLElement).getBoundingClientRect();
        if (rect.right - containerRect.left <= containerRect.width + 0.5) {
          count += 1;
        } else {
          break;
        }
      }
      setVisibleCount(count);
    };
    const first = window.requestAnimationFrame(compute);
    const ro = new ResizeObserver(() => {
      window.requestAnimationFrame(compute);
    });
    ro.observe(el);
    return () => {
      window.cancelAnimationFrame(first);
      ro.disconnect();
    };
  }, [chips]);

  // Animated placeholder: types → holds → deletes → next query. Uses an overlay,
  // never the input value, so user typing is never disturbed.
  const [typeText, setTypeText] = useState("");
  useEffect(() => {
    if (query.length > 0 || queryPool.length === 0) return;
    let cancelled = false;
    let timer: number | undefined;
    let qi = 0;
    let ci = 0;
    let phase: "idle" | "type" | "pause" | "delete" = "idle";

    const tick = () => {
      if (cancelled) return;
      const current = queryPool[qi % queryPool.length];
      if (!current) return;
      if (phase === "idle") {
        phase = "type";
        setTypeText("");
        timer = window.setTimeout(tick, TYPE_START_MS);
        return;
      }
      if (phase === "type") {
        ci += 1;
        setTypeText(current.slice(0, ci));
        if (ci >= current.length) {
          phase = "pause";
          timer = window.setTimeout(tick, PAUSE_FULL_MS);
        } else {
          timer = window.setTimeout(tick, TYPE_CHAR_MS);
        }
        return;
      }
      if (phase === "pause") {
        phase = "delete";
        timer = window.setTimeout(tick, DELETE_CHAR_MS);
        return;
      }
      ci -= 1;
      setTypeText(current.slice(0, ci));
      if (ci <= 0) {
        qi += 1;
        phase = "type";
        timer = window.setTimeout(tick, PAUSE_NEXT_MS);
      } else {
        timer = window.setTimeout(tick, DELETE_CHAR_MS);
      }
    };

    timer = window.setTimeout(tick, TYPE_START_MS);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [query, queryPool]);

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

  /** Insert a suggested query into the existing input (no separate search). */
  function fillQuery(q: string) {
    setQuery(q);
    inputRef.current?.focus();
  }

  return (
    <div ref={rootRef} className="flex w-full flex-col gap-3">
      <h2 className="mt-4 text-base font-semibold tracking-tight text-zinc-900">Поиск видео</h2>

      {chips.length > 0 ? (
        <div ref={chipsRef} className="flex w-full flex-nowrap gap-2 overflow-hidden">
          {chips.map((q, i) => (
            <button
              key={q}
              type="button"
              onClick={() => fillQuery(q)}
              disabled={searching}
              className={`shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-emerald-300 hover:text-emerald-800 disabled:opacity-50 ${
                i >= visibleCount ? "invisible" : ""
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex shrink-0 flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-zinc-900/5 sm:gap-4 sm:p-5">
        <div className="flex w-full min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
        <div className="flex w-full min-w-0 gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Поиск по теме</span>
          {query === "" && !searching && queryPool.length > 0 ? (
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-zinc-400">
              <span className="max-w-full truncate">{typeText}</span>
              <span className="ml-px animate-pulse">▍</span>
            </span>
          ) : null}
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder={queryPool.length > 0 ? "" : "Введите тему, нишу или ключевое слово..."}
            disabled={searching}
            className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm text-zinc-900 outline-none ring-emerald-500/20 transition-all placeholder:text-zinc-400 focus:border-emerald-400 focus:bg-white focus:ring-4 disabled:opacity-60 lg:h-11"
          />
        </label>

        <button
          type="button"
          onClick={submit}
          disabled={searching || !query.trim()}
          className="flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50 lg:h-11"
          title="Стоимость одного поиска (мок)"
        >
          <span className="tabular-nums">{searchCost}</span>
          <LightningIcon className="h-5 w-5 text-emerald-100" />
        </button>
        </div>

        <div className="flex w-full shrink-0 items-center gap-1 overflow-x-auto scrollbar-hidden lg:w-auto lg:overflow-visible">
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle("locale");
              }}
              disabled={searching}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-800 disabled:pointer-events-none disabled:opacity-50"
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
              disabled={searching}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-800 disabled:pointer-events-none disabled:opacity-50"
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
              disabled={searching}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-800 disabled:pointer-events-none disabled:opacity-50"
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
              disabled={searching}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-800 disabled:pointer-events-none disabled:opacity-50"
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
      </div>
    </div>
  );
}
