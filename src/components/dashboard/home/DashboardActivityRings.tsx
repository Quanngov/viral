"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DashboardActivityRing } from "@/lib/dashboard-home-types";

type ActivityRingsProps = {
  rings: DashboardActivityRing[];
  size?: number;
};

const RING_WIDTH = 8;
const GAP = 4.5;

function ringRadius(index: number, size: number) {
  const outer = size / 2 - RING_WIDTH / 2;
  return outer - index * (RING_WIDTH + GAP);
}

function formatValue(n: number, growth = false): string {
  if (growth) return `+${n.toLocaleString("ru-RU")}`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString("ru-RU");
}

function formatGoal(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

const RING_DESCRIPTION: Record<DashboardActivityRing["id"], string> = {
  videos: "Сколько роликов вы опубликовали в этом месяце из намеченной цели.",
  views: "Сколько просмотров набрали ваши ролики за последние 30 дней.",
  growth: "Насколько выросло число подписчиков за этот месяц.",
};

function RingTooltipContent({ ring }: { ring: DashboardActivityRing }) {
  const pct = ring.goal > 0 ? Math.min(100, Math.round((ring.current / ring.goal) * 100)) : 0;
  const growth = ring.id === "growth";
  return (
    <>
      <p className="dashboard-home-ring-tooltip__label">{ring.label}</p>
      <p className="dashboard-home-ring-tooltip__value">
        {formatValue(ring.current, growth)} / {formatGoal(ring.goal)} · {pct}%
      </p>
      <p className="dashboard-home-ring-tooltip__desc">{RING_DESCRIPTION[ring.id]}</p>
    </>
  );
}

function PortalRingTooltip({
  ring,
  anchorRef,
  visible,
}: {
  ring: DashboardActivityRing;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!visible || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
  }, [visible, ring, anchorRef]);

  useEffect(() => {
    if (!visible) return;
    const update = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [visible, anchorRef]);

  if (!visible || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="dashboard-home-ring-tooltip dashboard-home-ring-tooltip--portal dashboard-home-ring-tooltip--visible"
      role="tooltip"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        transform: "translate(-50%, 0)",
        zIndex: 10000,
      }}
    >
      <RingTooltipContent ring={ring} />
    </div>,
    document.body,
  );
}

export function DashboardActivityRings({ rings, size = 84 }: ActivityRingsProps) {
  const center = size / 2;
  const [hovered, setHovered] = useState<DashboardActivityRing["id"] | null>(null);
  const [tapped, setTapped] = useState<DashboardActivityRing["id"] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeId = tapped ?? hovered;
  const activeRing = rings.find((r) => r.id === activeId) ?? null;
  const showTooltip = Boolean(activeRing);

  useEffect(() => {
    if (!tapped) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setTapped(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [tapped]);

  const onRingActivate = useCallback((id: DashboardActivityRing["id"]) => {
    if (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches) return;
    setTapped((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div
      ref={containerRef}
      className="dashboard-home-rings"
      style={{ width: size, height: size }}
      onMouseLeave={() => setHovered(null)}
    >
      {activeRing ? (
        <PortalRingTooltip ring={activeRing} anchorRef={containerRef} visible={showTooltip} />
      ) : null}

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="dashboard-home-rings__svg -rotate-90"
        aria-hidden
      >
        {rings.map((ring, i) => {
          const r = ringRadius(i, size);
          const circumference = 2 * Math.PI * r;
          const progress = ring.goal > 0 ? Math.min(ring.current / ring.goal, 1) : 0;
          // Always keep a tiny arc so a zero-value ring still shows a small
          // colored starting segment (round cap makes it a small dot).
          const dash = Math.max(circumference * progress, 0.5);
          return (
            <g key={ring.id}>
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                className="dashboard-home-rings__track"
                strokeWidth={RING_WIDTH}
              />
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke={ring.color}
                strokeWidth={RING_WIDTH}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference - dash}`}
                className="dashboard-home-rings__progress"
              />
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke="transparent"
                strokeWidth={RING_WIDTH + GAP}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(ring.id)}
                onClick={() => onRingActivate(ring.id)}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
