"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { LANDING_COPY } from "@/components/landing/copy";
import { PlatformActivity } from "@/components/landing/ui/PlatformActivity";

export function HeroSearchCard() {
  const queries = LANDING_COPY.searchExamples.queries;
  const [index, setIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const query = queries[index] ?? queries[0];
  const typed = reduceMotion ? query : query.slice(0, charIndex);

  useEffect(() => {
    if (reduceMotion) return;
    if (charIndex < query.length) {
      const t = window.setTimeout(() => setCharIndex((c) => c + 1), 34);
      return () => window.clearTimeout(t);
    }
    const pause = window.setTimeout(() => {
      setIndex((i) => (i + 1) % queries.length);
      setCharIndex(0);
    }, 2400);
    return () => window.clearTimeout(pause);
  }, [charIndex, query, queries.length, reduceMotion]);

  return (
    <motion.div
      className="landing-hero-search"
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="landing-hero-search-input" aria-hidden>
        <p className="min-h-[4.25rem] text-left text-[1.0625rem] font-medium leading-snug text-[#3f3f46] md:min-h-[5rem] md:text-[1.125rem]">
          {typed}
          {!reduceMotion ? <span className="landing-cursor" /> : null}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#f4f4f5] pt-4">
          <PlatformActivity />
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5] text-[#71717a] shadow-sm"
            tabIndex={-1}
            aria-hidden
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
            </svg>
          </button>
        </div>
      </div>

      <a href="#platform" className="landing-hero-search-secondary">
        Посмотреть интерфейс
      </a>
    </motion.div>
  );
}
