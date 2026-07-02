"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { LANDING_COPY } from "@/components/landing/copy";
import { Reveal } from "@/components/landing/ui/Reveal";

export function SearchExamplesSection() {
  const queries = LANDING_COPY.searchExamples.queries;
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % queries.length);
    }, 3600);
    return () => window.clearInterval(id);
  }, [queries.length, reduceMotion]);

  return (
    <section className="border-y border-[#f4f4f5] bg-[#fafafa] py-20 md:py-28">
      <div className="landing-container">
        <Reveal className="mx-auto max-w-[36rem] text-center">
          <h2 className="landing-section-title text-[#0a0a0b]">{LANDING_COPY.searchExamples.title}</h2>
          <p className="landing-body-lg mt-4">{LANDING_COPY.searchExamples.subtitle}</p>
        </Reveal>

        <Reveal className="mx-auto mt-12 max-w-[44rem]" delay={0.08}>
          <div className="rounded-[1.25rem] border border-[#e4e4e7] bg-white p-2 shadow-[var(--landing-shadow)]">
            <div className="flex min-h-[5.5rem] flex-col justify-between rounded-xl border border-[#f4f4f5] bg-[#fafafa] px-5 py-4 text-left">
              <p className="text-[1.0625rem] font-medium leading-snug text-[#0a0a0b] md:text-[1.125rem]">
                {queries[active]}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-[#ebebed] pt-3">
                <span className="text-xs font-medium text-[#a1a1aa]">YouTube · Instagram</span>
                <span className="rounded-full bg-[#059669] px-3 py-1 text-xs font-semibold text-white">Найти</span>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="-mx-4 mt-8 overflow-x-auto px-4 pb-1 scrollbar-hide sm:mx-0 sm:overflow-visible sm:px-0">
          <div className="flex w-max min-w-full items-center gap-2 sm:w-auto sm:flex-wrap sm:justify-center">
            {queries.map((query, index) => (
              <button
                key={query}
                type="button"
                onClick={() => setActive(index)}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                  index === active
                    ? "border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]"
                    : "border-[#e4e4e7] bg-white text-[#52525b] hover:border-[#d4d4d8]"
                }`}
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
