import { LANDING_COPY } from "@/components/landing/copy";
import { Reveal } from "@/components/landing/ui/Reveal";

export function WorkflowSection() {
  return (
    <section id="workflow" className="py-20 md:py-32">
      <div className="landing-container">
        <Reveal className="mx-auto max-w-[32rem] text-center">
          <h2 className="landing-section-title text-[#0a0a0b]">{LANDING_COPY.workflow.title}</h2>
        </Reveal>

        <div className="relative mt-14 md:mt-16">
          <div className="absolute left-[1.25rem] top-3 bottom-3 w-px bg-[#e4e4e7] md:hidden" aria-hidden />
          <div className="absolute left-[10%] right-[10%] top-5 hidden h-px bg-[#e4e4e7] md:block" aria-hidden />
          <ol className="grid gap-8 md:grid-cols-5 md:gap-4">
            {LANDING_COPY.workflow.steps.map((step, index) => (
              <Reveal key={step.key} delay={index * 0.07}>
                <li className="relative flex gap-4 text-left md:block md:text-center">
                  <div className="relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d1fae5] bg-[#ecfdf5] text-sm font-bold text-[#047857] md:mx-auto">
                    {index + 1}
                  </div>
                  <div className="md:mt-4">
                    <h3 className="text-base font-semibold tracking-[-0.02em] text-[#0a0a0b]">{step.label}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#52525b]">{step.description}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
