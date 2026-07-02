import { LANDING_COPY } from "@/components/landing/copy";
import { Reveal } from "@/components/landing/ui/Reveal";

export function TrustedBySection() {
  const items = [...LANDING_COPY.trustedBy.logos, ...LANDING_COPY.trustedBy.logos];

  return (
    <section className="border-y border-[#f4f4f5] bg-white py-10 md:py-12" aria-label={LANDING_COPY.trustedBy.label}>
      <Reveal className="landing-container">
        <p className="text-center text-xs font-medium uppercase tracking-[0.14em] text-[#a1a1aa]">
          {LANDING_COPY.trustedBy.label}
        </p>
        <div className="relative mt-6 overflow-hidden mask-[linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="landing-marquee gap-12 px-4">
            {items.map((logo, i) => (
              <span
                key={`${logo}-${i}`}
                className="shrink-0 text-lg font-semibold tracking-[-0.03em] text-[#d4d4d8] transition-colors hover:text-[#a1a1aa]"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
