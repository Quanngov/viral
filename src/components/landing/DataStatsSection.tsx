import { LANDING_COPY } from "@/components/landing/copy";
import { Reveal } from "@/components/landing/ui/Reveal";

function BentoSearchCard() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0a0a0b] text-[10px] font-bold text-white">
          YT
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#f472b6] to-[#a855f7] text-[10px] font-bold text-white">
          IG
        </span>
      </div>
      <div className="mt-6">
        <p className="text-lg font-semibold tracking-[-0.02em] text-[#0a0a0b]">Поиск в реальном времени</p>
        <p className="mt-2 text-sm leading-relaxed text-[#52525b]">
          YouTube Shorts и Instagram Reels при каждом запросе в ленте.
        </p>
      </div>
    </div>
  );
}

function BentoTrendCard() {
  return (
    <div className="flex h-full flex-col">
      <p className="text-sm font-semibold text-[#0a0a0b]">Живые тренды</p>
      <div className="mt-4 rounded-xl border border-[#e4e4e7] bg-white p-3 shadow-sm">
        <p className="text-[11px] font-medium text-[#059669]">Новый тренд</p>
        <p className="mt-1 text-xs leading-relaxed text-[#3f3f46]">
          ViralCloud подтягивает свежие ролики в боковой ленте на главной.
        </p>
      </div>
      <div className="mt-4 flex items-end gap-2">
        {[82, 91, 94].map((score) => (
          <div key={score} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="rounded-md bg-[#059669] px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
              {score}
            </span>
            <div className="h-10 w-full rounded-lg bg-gradient-to-b from-[#d1fae5] to-[#059669]/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

function BentoTranscribeCard() {
  return (
    <div className="flex h-full flex-col justify-between gap-4 md:flex-row md:items-center">
      <div className="max-w-md">
        <p className="text-lg font-semibold tracking-[-0.02em] text-[#0a0a0b]">Транскрибация и оценка виральности</p>
        <p className="mt-2 text-sm leading-relaxed text-[#52525b]">
          Транскрипт — 10 токенов. Оценка 0–99 в каждой карточке ленты — как в приложении.
        </p>
      </div>
      <div className="shrink-0 rounded-xl border border-[#e4e4e7] bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#a1a1aa]">Транскрипт</p>
          <span className="rounded-md bg-[#059669] px-2 py-0.5 text-[10px] font-bold text-white">94</span>
        </div>
        <p className="mt-2 max-w-[260px] text-xs leading-relaxed text-[#3f3f46]">
          «Большинство экспертов снимают ролики так, что их никто не досматривает…»
        </p>
      </div>
    </div>
  );
}

export function DataStatsSection() {
  return (
    <section className="border-y border-[#f4f4f5] bg-white py-20 md:py-32">
      <div className="landing-container">
        <Reveal>
          <h2 className="landing-section-title max-w-[24ch] text-[#0a0a0b]">{LANDING_COPY.data.title}</h2>
        </Reveal>

        <div className="landing-bento mt-12 md:mt-16">
          <Reveal className="landing-bento-stat">
            <div className="landing-bento-card landing-bento-card--stat h-full">
              <p className="text-5xl font-semibold tracking-[-0.04em] text-[#0a0a0b] md:text-6xl">
                {LANDING_COPY.data.statValue}
              </p>
              <p className="mt-2 text-sm text-[#52525b]">{LANDING_COPY.data.statLabel}</p>
              <div className="mt-auto flex gap-2 pt-8">
                {[155, 168, 142, 45].map((hue) => (
                  <div
                    key={hue}
                    className="h-16 w-11 rounded-lg bg-gradient-to-b from-[#d1fae5] to-[#059669]/35"
                    style={{ filter: `hue-rotate(${hue - 155}deg)` }}
                    aria-hidden
                  />
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal className="landing-bento-search" delay={0.05}>
            <div className="landing-bento-card h-full">
              <BentoSearchCard />
            </div>
          </Reveal>

          <Reveal className="landing-bento-trends" delay={0.08}>
            <div className="landing-bento-card h-full">
              <BentoTrendCard />
            </div>
          </Reveal>

          <Reveal className="landing-bento-transcribe" delay={0.12}>
            <div className="landing-bento-card h-full">
              <BentoTranscribeCard />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
