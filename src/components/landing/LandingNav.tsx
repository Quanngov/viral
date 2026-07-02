"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LANDING_COPY } from "@/components/landing/copy";
import { LandingButton } from "@/components/landing/ui/LandingButton";
import { ViralLogoLink } from "@/components/landing/ui/ViralLogo";

const NAV_LINKS = [
  { href: "#features", label: LANDING_COPY.nav.features },
  { href: "#workflow", label: LANDING_COPY.nav.workflow },
  { href: "#pricing", label: LANDING_COPY.nav.pricing },
  { href: "#faq", label: LANDING_COPY.nav.faq },
];

const SCROLL_THRESHOLD = 8;

export function LandingNav() {
  const [onHero, setOnHero] = useState(true);

  useEffect(() => {
    const onScroll = () => {
      setOnHero(window.scrollY < SCROLL_THRESHOLD);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`landing-nav fixed z-50 transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        onHero ? "landing-nav--hero" : "landing-nav--floating"
      }`}
    >
      <div
        className={`landing-nav-bar transition-[background,border-color,box-shadow,border-radius] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          onHero ? "landing-nav-bar--hero" : "landing-nav-bar--floating"
        }`}
      >
        <div className="landing-nav-inner flex h-[4.25rem] items-center justify-between gap-4 sm:h-[4.5rem]">
          <div className="flex h-full items-center">
            <ViralLogoLink variant={onHero ? "inverse" : "default"} />
          </div>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Основная навигация">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  onHero ? "text-white/80 hover:text-white" : "text-[#52525b] hover:text-[#0a0a0b]"
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {onHero ? (
              <>
                <Link
                  href="/"
                  className="hidden text-sm font-medium text-white/80 transition-colors hover:text-white sm:inline"
                >
                  {LANDING_COPY.nav.login}
                </Link>
                <Link href="/" className="landing-btn landing-btn-white px-4 py-2.5 text-sm">
                  {LANDING_COPY.nav.cta}
                </Link>
              </>
            ) : (
              <>
                <LandingButton href="/" variant="ghost" className="hidden px-4 py-2.5 text-sm sm:inline-flex">
                  {LANDING_COPY.nav.login}
                </LandingButton>
                <LandingButton href="/" variant="emerald" className="px-4 py-2.5 text-sm">
                  {LANDING_COPY.nav.cta}
                </LandingButton>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
