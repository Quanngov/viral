"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { LANDING_COPY } from "@/components/landing/copy";
import { HeroSearchCard } from "@/components/landing/ui/HeroSearchCard";
import { HeroVideoMarquee } from "@/components/landing/ui/HeroVideoMarquee";

type HeroSectionProps = {
  marqueeVideos: Array<{ id: string; title: string; views: string }>;
};

export function HeroSection({ marqueeVideos }: HeroSectionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section id="hero" className="landing-hero-band">
      <div className="landing-container landing-hero-inner">
        <div className="landing-hero-stage">
          <div className="landing-hero-stack">
            <div className="landing-hero-grid">
              <div className="landing-hero-copy">
                <motion.h1
                  className="landing-display-hero max-w-[14ch] text-white"
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  {LANDING_COPY.hero.title}
                </motion.h1>

                <motion.p
                  className="landing-hero-subtitle"
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  {LANDING_COPY.hero.subtitle}
                </motion.p>

                <motion.div
                  className="landing-hero-actions"
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link href="/" className="landing-btn landing-btn-white px-6 py-3.5 text-[0.9375rem]">
                    {LANDING_COPY.hero.cta} →
                  </Link>
                  <p className="landing-hero-stat">
                    <span className="font-semibold text-white">{LANDING_COPY.hero.statValue}</span>{" "}
                    {LANDING_COPY.hero.stat}
                  </p>
                </motion.div>
              </div>

              <div className="landing-hero-visual">
                <HeroSearchCard />
              </div>
            </div>

            <HeroVideoMarquee videos={marqueeVideos} />
          </div>
        </div>
      </div>
    </section>
  );
}
