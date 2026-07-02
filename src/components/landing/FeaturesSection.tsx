import Link from "next/link";
import { LANDING_COPY } from "@/components/landing/copy";
import { FeatureMock } from "@/components/landing/ui/FeatureMock";
import { Reveal } from "@/components/landing/ui/Reveal";

const FEATURE_VARIANTS = ["search", "competitor", "script"] as const;

const CTA_TONE_CLASS = {
  emerald: "text-[#059669] hover:text-[#047857]",
  amber: "text-[#d97706] hover:text-[#b45309]",
  mint: "text-[#059669] hover:text-[#047857]",
} as const;

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-32">
      <div className="landing-container">
        <Reveal>
          <h2 className="landing-section-title mx-auto max-w-[24ch] text-center text-[#0a0a0b]">
            {LANDING_COPY.features.title}
          </h2>
        </Reveal>

        <div className="mt-14 md:mt-20">
          {LANDING_COPY.features.items.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.06}>
              <article
                className={`landing-feature-row ${index % 2 === 1 ? "landing-feature-row--reverse" : ""}`}
              >
                <div className="landing-feature-copy">
                  <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[#0a0a0b] md:text-[1.875rem]">
                    {item.title}
                  </h3>
                  <p className="mt-4 max-w-[34rem] text-[1.0625rem] leading-relaxed text-[#52525b]">
                    {item.description}
                  </p>
                  <Link
                    href="/"
                    className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold transition-colors ${CTA_TONE_CLASS[item.ctaTone]}`}
                  >
                    {item.cta}
                    <span aria-hidden>→</span>
                  </Link>
                </div>
                <div className="landing-feature-visual">
                  <FeatureMock variant={FEATURE_VARIANTS[index] ?? "search"} />
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
