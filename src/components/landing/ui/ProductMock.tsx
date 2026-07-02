"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

const NAV_ITEMS = [
  { label: "Главная", active: true },
  { label: "Шпион конкурентов", active: false },
  { label: "Сохранённые ролики", active: false },
  { label: "Генерация сценариев", active: false },
];

const TRENDS = [
  { tag: "Фитнес-хуки", delta: "+24%" },
  { tag: "Бьюти UGC", delta: "+18%" },
  { tag: "Коучинг 60с", delta: "+31%" },
];

const VIDEOS = [
  {
    title: "3 ошибки, которые убивают удержание",
    score: 94,
    views: "2,1M",
    age: "3д",
    platform: "YT",
    hue: 155,
  },
  {
    title: "Хук, который залетел за 48 часов",
    score: 91,
    views: "1,2M",
    age: "2д",
    platform: "IG",
    hue: 168,
  },
  {
    title: "Формат «до / после» для экспертов",
    score: 87,
    views: "840K",
    age: "1д",
    platform: "YT",
    hue: 142,
  },
  {
    title: "Сценарий под продуктивность",
    score: 82,
    views: "320K",
    age: "5ч",
    platform: "IG",
    hue: 45,
  },
];

function scoreClass(score: number) {
  if (score >= 85) return "bg-[#059669] text-white border-transparent";
  if (score >= 65) return "bg-white text-[#047857] border-[#a7f3d0]";
  return "bg-[#f59e0b] text-white border-transparent";
}

export function ProductMock({ compact = false }: { compact?: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="landing-product-mock"
      role="img"
      aria-label="Превью интерфейса ViralCloud"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="landing-product-mock-chrome">
        <span className="h-2.5 w-2.5 rounded-full bg-[#fca5a5]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#fde68a]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#86efac]" />
        <div className="ml-2 flex flex-1 items-center gap-2">
          <Image src="/viral-logo.png" alt="" width={16} height={16} className="rounded-[4px]" />
          <span className="text-[11px] font-medium text-[#71717a]">ViralCloud — рабочее пространство</span>
        </div>
        <span className="rounded-md bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-semibold text-[#047857]">Pro</span>
      </div>

      <div className={`landing-product-mock-body ${compact ? "landing-product-mock-body--compact" : ""}`}>
        <aside className="landing-product-mock-sidebar">
          <div className="rounded-xl border border-[#ebebed] bg-white p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a1a1aa]">Живые тренды</p>
            <ul className="mt-2.5 space-y-2">
              {TRENDS.map((t) => (
                <li key={t.tag} className="flex items-center justify-between rounded-lg bg-[#fafafa] px-2 py-1.5">
                  <span className="text-[11px] font-medium text-[#3f3f46]">{t.tag}</span>
                  <span className="text-[10px] font-semibold text-[#059669]">{t.delta}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-3">
            <p className="text-[10px] font-medium text-[#047857]">Баланс</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums tracking-tight text-[#064e3b]">2 840 токенов</p>
          </div>
          <nav className="mt-3 space-y-0.5" aria-hidden>
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className={`rounded-lg px-2 py-1.5 text-[10px] font-medium leading-tight ${
                  item.active ? "bg-[#ecfdf5] text-[#047857]" : "text-[#71717a]"
                }`}
              >
                {item.label}
              </div>
            ))}
          </nav>
        </aside>

        <div className="landing-product-mock-main">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f4f4f5] pb-4">
            <div>
              <p className="text-sm font-semibold tracking-tight text-[#0a0a0b]">Поиск трендовых роликов</p>
              <p className="mt-0.5 text-xs text-[#71717a]">Shorts · Reels · оценка виральности</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[#e4e4e7] bg-white px-3 py-1 text-[11px] font-medium text-[#52525b]">
                Ниша: продуктивность
              </span>
              <span className="hidden rounded-full bg-[#0a0a0b] px-3 py-1 text-[11px] font-semibold text-white sm:inline">
                Поиск · 5 токенов
              </span>
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-hidden rounded-xl border border-[#e4e4e7] bg-[#fafafa] px-3 py-2">
            <span className="text-[#a1a1aa]" aria-hidden>
              ⌕
            </span>
            <p className="truncate text-xs font-medium text-[#52525b]">хуки для экспертов в нише продуктивности</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {VIDEOS.map((video) => (
              <article key={video.title} className="overflow-hidden rounded-2xl border border-[#ebebed] bg-white shadow-[0_1px_2px_rgb(9_9_11/0.04)]">
                <div
                  className="relative aspect-[3/4]"
                  style={{
                    background: `linear-gradient(165deg, oklch(72% 0.09 ${video.hue}), oklch(42% 0.05 ${video.hue}))`,
                  }}
                >
                  <span className="absolute left-2 top-2 rounded-md bg-black/45 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    {video.platform}
                  </span>
                  <span
                    className={`absolute right-2 top-2 rounded-lg border px-1.5 py-0.5 text-[10px] font-bold tabular-nums shadow-sm ${scoreClass(video.score)}`}
                  >
                    {video.score}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-2.5 pt-8">
                    <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-white">{video.title}</p>
                    <div className="mt-1 flex justify-between text-[9px] font-medium text-white/85">
                      <span>{video.views}</span>
                      <span>{video.age}</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {!compact ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-[#e4e4e7] bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#a1a1aa]">Шпион конкурентов</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-[#3f3f46]">@productivity.guru</span>
                  <span className="font-semibold text-[#059669]">+3 новых</span>
                </div>
              </div>
              <div className="rounded-xl border border-[#d1fae5] bg-[#ecfdf5]/50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#047857]">Черновик сценария</p>
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-[#3f3f46]">
                  Хук: «Вы тратите 2 часа на то, что можно сделать за 20 минут…»
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
