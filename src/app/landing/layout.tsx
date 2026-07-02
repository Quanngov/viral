import type { Metadata } from "next";
import "@/components/landing/landing.css";

export const metadata: Metadata = {
  title: "ViralCloud — AI-платформа исследования вирусного контента",
  description:
    "Находите трендовые Shorts и Reels, анализируйте конкурентов и создавайте сценарии на основе живых данных.",
  icons: {
    icon: "/viral-logo.png",
    apple: "/viral-logo.png",
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <div className="landing-root">{children}</div>;
}
