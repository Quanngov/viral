"use client";

import { useCountUp } from "@/hooks/use-count-up";

export function ProfileAnimatedNumber({
  value,
  animate = true,
  suffix = "",
}: {
  value: number;
  animate?: boolean;
  suffix?: string;
}) {
  const display = useCountUp(value, { animate: animate && value > 0 });
  return (
    <span className="tabular-nums">
      {display.toLocaleString("ru-RU")}
      {suffix}
    </span>
  );
}
