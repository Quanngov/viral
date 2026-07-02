"use client";

import { motion, useReducedMotion } from "framer-motion";

type FeatureMockProps = {
  variant: "search" | "competitor" | "script";
};

const SEARCH_ROWS = [
  { title: "3 ошибки, которые убивают удержание", views: "2,1M", score: 94, platform: "YT" },
  { title: "Формат «до / после» для экспертов", views: "840K", score: 88, platform: "IG" },
  { title: "Хук, который залетел за 48 часов", views: "1,2M", score: 91, platform: "YT" },
];

const COMPETITOR_ROWS = [
  { account: "@productivity.guru", views: "1,4M", likes: "82K", score: 92 },
  { account: "@coach.anna", views: "890K", likes: "41K", score: 87 },
  { account: "@fitdaily", views: "620K", likes: "28K", score: 79 },
];

function SearchMock() {
  return (
    <div className="landing-feature-mock-panel landing-feature-mock-panel--emerald">
      <div className="landing-feature-mock-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#f4f4f5] px-4 py-3">
          <span className="rounded-full bg-[#0a0a0b] px-3 py-1 text-[11px] font-semibold text-white">Поиск</span>
          <span className="rounded-full border border-[#e4e4e7] px-2.5 py-1 text-[11px] text-[#52525b]">Shorts + Reels</span>
          <span className="rounded-full border border-[#e4e4e7] px-2.5 py-1 text-[11px] text-[#52525b]">7 дней</span>
          <span className="rounded-full border border-[#e4e4e7] px-2.5 py-1 text-[11px] text-[#52525b]">Виральность ↓</span>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm font-medium text-[#0a0a0b]">
            хуки для экспертов в нише продуктивности с оценкой выше 85
          </p>
        </div>
        <div className="space-y-2 px-3 pb-3">
          {SEARCH_ROWS.map((row) => (
            <div
              key={row.title}
              className="flex items-center gap-3 rounded-xl border border-[#f4f4f5] bg-[#fafafa] p-2.5"
            >
              <div
                className="h-12 w-9 shrink-0 rounded-lg bg-gradient-to-b from-[#d1fae5] to-[#059669]/40"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#0a0a0b]">{row.title}</p>
                <p className="text-[10px] text-[#71717a]">
                  {row.platform} · {row.views}
                </p>
              </div>
              <span className="rounded-lg bg-[#059669] px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
                {row.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompetitorMock() {
  return (
    <div className="landing-feature-mock-panel landing-feature-mock-panel--amber">
      <div className="landing-feature-mock-card">
        <div className="border-b border-[#f4f4f5] px-4 py-3">
          <p className="text-sm font-semibold text-[#0a0a0b]">Шпион конкурентов</p>
          <p className="text-[11px] text-[#71717a]">Последние Reels · сортировка по просмотрам</p>
        </div>
        <div className="px-3 py-2">
          <div className="grid grid-cols-[1.4fr_0.7fr_0.6fr_0.5fr] gap-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#a1a1aa]">
            <span>Аккаунт</span>
            <span>Просм.</span>
            <span>Лайки</span>
            <span>Оценка</span>
          </div>
          {COMPETITOR_ROWS.map((row) => (
            <div
              key={row.account}
              className="grid grid-cols-[1.4fr_0.7fr_0.6fr_0.5fr] items-center gap-2 rounded-lg px-2 py-2 text-xs hover:bg-[#fafafa]"
            >
              <span className="truncate font-medium text-[#0a0a0b]">{row.account}</span>
              <span className="tabular-nums text-[#52525b]">{row.views}</span>
              <span className="tabular-nums text-[#52525b]">{row.likes}</span>
              <span className="w-fit rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                {row.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScriptMock() {
  return (
    <div className="landing-feature-mock-panel landing-feature-mock-panel--mint">
      <div className="landing-feature-mock-card">
        <div className="flex items-center justify-between border-b border-[#f4f4f5] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[#0a0a0b]">Генерация сценариев</p>
            <p className="text-[11px] text-[#71717a]">Чат · импорт из сохранённых роликов</p>
          </div>
          <span className="rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-semibold text-[#047857]">25 токенов</span>
        </div>
        <div className="space-y-3 p-4">
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[#059669] px-3 py-2 text-xs leading-relaxed text-white">
            Напиши сценарий по мотивам сохранённого ролика про продуктивность
          </div>
          <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-[#e4e4e7] bg-[#fafafa] px-3 py-2.5 text-xs leading-relaxed text-[#3f3f46]">
            <p className="font-semibold text-[#0a0a0b]">Хук</p>
            <p className="mt-1">«Вы тратите 2 часа на то, что можно сделать за 20 минут — вот почему…»</p>
            <p className="mt-2 font-semibold text-[#0a0a0b]">Структура</p>
            <p className="mt-1">Проблема → контраст → 3 шага → CTA</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeatureMock({ variant }: FeatureMockProps) {
  const reduceMotion = useReducedMotion();
  const content = variant === "competitor" ? <CompetitorMock /> : variant === "script" ? <ScriptMock /> : <SearchMock />;

  if (reduceMotion) {
    return content;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {content}
    </motion.div>
  );
}
