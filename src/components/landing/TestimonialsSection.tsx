import { LANDING_COPY } from "@/components/landing/copy";
import { Reveal } from "@/components/landing/ui/Reveal";

function TestimonialAvatar({ name, hue }: { name: string; hue: number }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 45% 42%), hsl(${hue} 55% 32%))` }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section className="bg-[#f4f4f5] py-20 md:py-32">
      <div className="landing-container">
        <Reveal>
          <div className="relative text-center">
            <span className="landing-testimonial-emoji landing-testimonial-emoji--1" aria-hidden>
              ❤️
            </span>
            <span className="landing-testimonial-emoji landing-testimonial-emoji--2" aria-hidden>
              💙
            </span>
            <span className="landing-testimonial-emoji landing-testimonial-emoji--3" aria-hidden>
              🔥
            </span>
            <span className="landing-testimonial-emoji landing-testimonial-emoji--4" aria-hidden>
              ❤️‍🔥
            </span>
            <h2 className="landing-section-title mx-auto max-w-[22ch] text-[#0a0a0b]">
              {LANDING_COPY.testimonials.title}
            </h2>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_COPY.testimonials.items.map((item, index) => (
            <Reveal key={item.handle} delay={index * 0.05}>
              <article className="landing-testimonial-card">
                <header className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <TestimonialAvatar name={item.name} hue={item.hue} />
                    <div>
                      <p className="text-sm font-semibold text-[#0a0a0b]">{item.name}</p>
                      <p className="text-xs text-[#71717a]">{item.handle}</p>
                    </div>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-[#0a0a0b]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </header>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-[#27272a]">{item.quote}</p>
                <p className="mt-4 text-xs text-[#a1a1aa] underline decoration-[#d4d4d8] underline-offset-2">
                  {item.credential}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
