import Link from "next/link";
import type { ReactNode } from "react";

type LandingButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "emerald" | "ghost" | "white";
  className?: string;
};

export function LandingButton({
  href,
  children,
  variant = "primary",
  className = "",
}: LandingButtonProps) {
  const variantClass =
    variant === "emerald"
      ? "landing-btn-emerald"
      : variant === "ghost"
        ? "landing-btn-ghost"
        : variant === "white"
          ? "landing-btn-white"
          : "landing-btn-primary";

  return (
    <Link href={href} className={`landing-btn ${variantClass} ${className}`}>
      {children}
    </Link>
  );
}
