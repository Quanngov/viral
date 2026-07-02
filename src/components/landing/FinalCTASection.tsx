import Image from "next/image";
import { LANDING_COPY } from "@/components/landing/copy";
import { LandingButton } from "@/components/landing/ui/LandingButton";
import { Reveal } from "@/components/landing/ui/Reveal";
import { ViralLogoLink } from "@/components/landing/ui/ViralLogo";

export function FinalCTASection() {
  return (
    <section className="mx-3 mb-3 overflow-hidden rounded-[1.5rem] bg-[#064e3b] py-20 text-white md:py-24">
      <div className="landing-container text-center">
        <Reveal>
          <Image
            src="/viral-logo.png"
            alt=""
            width={56}
            height={56}
            className="mx-auto rounded-[22%] shadow-lg"
          />
          <h2 className="landing-section-title mx-auto mt-6 max-w-[20ch] text-white">
            {LANDING_COPY.finalCta.title}
          </h2>
        </Reveal>
        <Reveal className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" delay={0.08}>
          <LandingButton href="/" variant="white" className="min-w-[200px] px-6 py-3.5">
            {LANDING_COPY.finalCta.cta}
          </LandingButton>
          <a
            href="mailto:support@viral.app"
            className="landing-btn landing-btn-ghost-inverse min-w-[200px] px-6 py-3.5"
          >
            {LANDING_COPY.finalCta.support}
          </a>
        </Reveal>
      </div>
    </section>
  );
}

export function FooterSection() {
  return (
    <footer className="border-t border-[#f4f4f5] bg-white py-12">
      <div className="landing-container flex flex-col items-center justify-between gap-6 sm:flex-row">
        <ViralLogoLink size="sm" />
        <p className="max-w-xs text-center text-sm text-[#71717a] sm:text-left">{LANDING_COPY.footer.tagline}</p>
        <p className="text-sm text-[#a1a1aa]">
          {LANDING_COPY.footer.copyright} {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
