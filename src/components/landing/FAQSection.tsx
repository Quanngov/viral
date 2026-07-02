"use client";

import { useState } from "react";
import { LANDING_COPY } from "@/components/landing/copy";
import { Reveal } from "@/components/landing/ui/Reveal";

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="py-20 md:py-32">
      <div className="landing-container max-w-[44rem]">
        <Reveal className="text-center">
          <h2 className="landing-section-title text-[#0a0a0b]">{LANDING_COPY.faq.title}</h2>
        </Reveal>

        <div className="mt-10 divide-y divide-[#f4f4f5] rounded-2xl border border-[#e4e4e7] bg-white shadow-sm">
          {LANDING_COPY.faq.items.map((item, index) => {
            const open = openIndex === index;
            return (
              <Reveal key={item.q} delay={index * 0.05}>
                <div>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-[#fafafa] md:px-6"
                    aria-expanded={open}
                    onClick={() => setOpenIndex(open ? -1 : index)}
                  >
                    <span className="text-base font-semibold text-[#0a0a0b]">{item.q}</span>
                    <span className="text-xl leading-none text-[#a1a1aa]" aria-hidden>
                      {open ? "×" : "+"}
                    </span>
                  </button>
                  {open ? (
                    <div className="px-5 pb-5 text-[0.9375rem] leading-relaxed text-[#52525b] md:px-6 md:pb-6">
                      {item.a}
                    </div>
                  ) : null}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
