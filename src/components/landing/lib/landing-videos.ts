import "server-only";

import { formatViewsCount } from "@/lib/format-video";

export type LandingMarqueeVideo = {
  id: string;
  title: string;
  views: string;
};

const STATIC_MARQUEE: { id: string; title: string; views: number }[] = [
  { id: "static-1", title: "Как найти тренд за 5 минут", views: 2_450_000 },
  { id: "static-2", title: "Топ-3 хука для удержания", views: 1_120_000 },
  { id: "static-3", title: "Сценарий под нишу: разбор", views: 980_000 },
  { id: "static-4", title: "Вирусный монтаж: что работает", views: 3_310_000 },
  { id: "static-5", title: "30 идей роликов на неделю", views: 740_000 },
  { id: "static-6", title: "Рост подписчиков без рекламы", views: 1_860_000 },
];

export async function getLandingMarqueeVideos(limit = 30): Promise<LandingMarqueeVideo[]> {
  // Must stay fully static: landing route must not depend on DB or auth.
  return STATIC_MARQUEE.slice(0, Math.max(1, Math.min(60, limit))).map((v) => ({
    id: v.id,
    title: v.title,
    views: formatViewsCount(v.views),
  }));
}
