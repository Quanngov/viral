import { LANDING_COPY } from "@/components/landing/copy";
import { ProductMock } from "@/components/landing/ui/ProductMock";
import { Reveal } from "@/components/landing/ui/Reveal";

export function PlatformPreviewSection() {
  return (
    <section id="platform" className="bg-white py-20 md:py-32">
      <div className="landing-container-wide">
        <Reveal className="mx-auto max-w-[40rem] text-center">
          <h2 className="landing-section-title text-[#0a0a0b]">{LANDING_COPY.platform.title}</h2>
          <p className="landing-body-lg mt-4">{LANDING_COPY.platform.subtitle}</p>
        </Reveal>

        <Reveal className="mt-12 md:mt-16" delay={0.08}>
          <ProductMock />
        </Reveal>
      </div>
    </section>
  );
}
