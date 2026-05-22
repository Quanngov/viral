"use client";

import { useEffect, useRef, useState } from "react";

type UseCountUpOptions = {
  /** Run smooth animation once when target becomes available. */
  animate: boolean;
  durationMs?: number;
};

/**
 * Lightweight count-up for token balance — runs only when `animate` is true once.
 */
export function useCountUp(target: number, opts: UseCountUpOptions): number {
  const { animate, durationMs = 420 } = opts;
  const [display, setDisplay] = useState(animate ? 0 : target);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (!animate) {
      setDisplay(target);
      return;
    }
    if (animatedRef.current) {
      setDisplay(target);
      return;
    }
    if (target <= 0) {
      setDisplay(target);
      return;
    }

    animatedRef.current = true;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else setDisplay(target);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, animate, durationMs]);

  return display;
}
