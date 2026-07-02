"use client";

import { useId, useState } from "react";

type AdminInfoTipProps = {
  text: string;
  className?: string;
};

/** Compact ⓘ tooltip for advanced admin settings. */
export function AdminInfoTip({ text, className = "" }: AdminInfoTipProps) {
  const [open, setOpen] = useState(false);
  const tipId = useId();

  return (
    <span className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        aria-describedby={open ? tipId : undefined}
        aria-label="Подсказка"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
      >
        ⓘ
      </button>
      {open ? (
        <span
          id={tipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-50 w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[11px] leading-snug text-zinc-600 shadow-lg shadow-zinc-900/10"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
