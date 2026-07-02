import { LANDING_COPY } from "@/components/landing/copy";
import { Reveal } from "@/components/landing/ui/Reveal";

const ROW_A = LANDING_COPY.benefits.items.slice(0, 6);
const ROW_B = LANDING_COPY.benefits.items.slice(6);

function MarqueeRow({ items, reverse = false }: { items: readonly string[]; reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden mask-[linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className={`landing-marquee gap-3 ${reverse ? "landing-marquee-reverse" : ""}`}>
        {doubled.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="shrink-0 rounded-full border border-[#e4e4e7] bg-white px-4 py-2 text-sm font-medium text-[#3f3f46] shadow-sm"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function BenefitsSection() {
  return (
    <section className="border-y border-[#f4f4f5] bg-[#fafafa] py-20 md:py-24">
      <div className="landing-container">
        <Reveal className="text-center">
          <h2 className="landing-section-title mx-auto max-w-[20ch] text-[#0a0a0b]">{LANDING_COPY.benefits.title}</h2>
        </Reveal>
      </div>

      <div className="mt-10 space-y-3">
        <MarqueeRow items={ROW_A} />
        <MarqueeRow items={ROW_B} reverse />
      </div>
    </section>
  );
}
