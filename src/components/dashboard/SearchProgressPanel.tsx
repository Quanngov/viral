"use client";

import { useEffect, useState } from "react";

export type SearchProgressStep = {
  id: string;
  label: string;
};

export const SEARCH_PROGRESS_STEPS: SearchProgressStep[] = [
  { id: "understand", label: "Understanding your request..." },
  { id: "optimize", label: "Optimizing search..." },
  { id: "database", label: "Searching ViralCloud database..." },
  { id: "fresh", label: "Checking fresh videos..." },
  { id: "rank", label: "Ranking results..." },
];

export const LOAD_MORE_PROGRESS_STEPS: SearchProgressStep[] = [
  { id: "database", label: "Searching ViralCloud database..." },
  { id: "fresh", label: "Checking fresh videos..." },
  { id: "rank", label: "Ranking results..." },
];

export type SearchProgressPhase = "pending" | "active" | "done";

export function useAnimatedSearchProgress(
  active: boolean,
  steps: SearchProgressStep[],
  stepMs = 680,
) {
  const [phases, setPhases] = useState<SearchProgressPhase[]>(() => steps.map(() => "pending"));

  useEffect(() => {
    if (!active) {
      setPhases(steps.map(() => "pending"));
      return;
    }

    setPhases(steps.map((_, i) => (i === 0 ? "active" : "pending")));

    let idx = 0;
    const timers: number[] = [];

    const advance = () => {
      idx += 1;
      if (idx >= steps.length) return;
      setPhases((prev) =>
        prev.map((_, i) => {
          if (i < idx) return "done";
          if (i === idx) return "active";
          return "pending";
        }),
      );
      timers.push(window.setTimeout(advance, stepMs));
    };

    timers.push(window.setTimeout(advance, stepMs));

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [active, steps, stepMs]);

  const complete = () => setPhases(steps.map(() => "done"));

  return { phases, complete };
}

type SearchProgressPanelProps = {
  steps: SearchProgressStep[];
  phases: SearchProgressPhase[];
  compact?: boolean;
};

export function SearchProgressPanel({ steps, phases, compact = false }: SearchProgressPanelProps) {
  return (
    <div
      className={`search-progress-panel relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-emerald-50/30 shadow-sm shadow-zinc-900/[0.04] ${
        compact ? "px-4 py-3" : "px-5 py-4"
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 0% 0%, rgba(16,185,129,0.08), transparent 55%)",
        }}
      />
      <div className="relative space-y-2.5">
        {steps.map((step, i) => {
          const phase = phases[i] ?? "pending";
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 transition-all duration-500 ease-out ${
                phase === "pending" ? "opacity-40" : "opacity-100"
              }`}
            >
              <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                {phase === "done" ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
                    <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                      <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z" />
                    </svg>
                  </span>
                ) : phase === "active" ? (
                  <span className="relative flex h-5 w-5 items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
                    <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                )}
              </span>
              <span
                className={`text-sm leading-snug transition-colors duration-300 ${
                  phase === "active"
                    ? "font-medium text-zinc-900"
                    : phase === "done"
                      ? "text-zinc-600"
                      : "text-zinc-400"
                }`}
              >
                {step.label}
              </span>
              {phase === "active" ? (
                <span className="ml-auto h-1 w-12 overflow-hidden rounded-full bg-zinc-100">
                  <span className="search-progress-shimmer block h-full w-full bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
