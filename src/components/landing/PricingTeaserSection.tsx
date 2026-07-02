import { LANDING_COPY } from "@/components/landing/copy";
import { LandingButton } from "@/components/landing/ui/LandingButton";
import { Reveal } from "@/components/landing/ui/Reveal";

export function PricingTeaserSection() {
  const { pricing } = LANDING_COPY;

  return (
    <section id="pricing" className="border-y border-[#f4f4f5] bg-[#fafafa] py-20 md:py-32">
      <div className="landing-container">
        <Reveal className="mx-auto max-w-[34rem] text-center">
          <h2 className="landing-section-title text-[#0a0a0b]">{pricing.title}</h2>
          <p className="landing-body-lg mt-4">{pricing.subtitle}</p>
        </Reveal>

        <Reveal className="mx-auto mt-12 max-w-[28rem]" delay={0.08}>
          <article className="overflow-hidden rounded-[1.25rem] border border-[#e4e4e7] bg-white shadow-[var(--landing-shadow-lg)]">
            <div className="border-b border-[#f4f4f5] bg-[#ecfdf5] px-6 py-3.5 text-center text-sm font-semibold text-[#047857]">
              {pricing.trial}
            </div>
            <div className="p-7 md:p-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#a1a1aa]">{pricing.planName}</p>
                  <p className="mt-2 text-[2.5rem] font-semibold leading-none tracking-[-0.04em] text-[#0a0a0b]">
                    {pricing.price}
                    <span className="text-base font-medium text-[#71717a]">{pricing.period}</span>
                  </p>
                </div>
                <p className="rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#047857]">
                  {pricing.payToday}
                </p>
              </div>

              <ul className="mt-7 space-y-3.5">
                {pricing.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-[0.9375rem] text-[#3f3f46]">
                    <span className="mt-0.5 font-semibold text-[#059669]" aria-hidden>
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <LandingButton href="/" variant="emerald" className="mt-8 w-full py-3.5">
                {pricing.cta}
              </LandingButton>
              <p className="mt-3 text-center text-xs text-[#a1a1aa]">{pricing.guarantee}</p>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}
