/** Возраст в часах, минимум 1. */
export function computeAgeHours(publishedAt: Date, now = new Date()): number {
  const ms = now.getTime() - publishedAt.getTime();
  return Math.max(ms / 3_600_000, 1);
}

export function computeViewsPerHour(views: number, ageHours: number): number {
  return views / Math.max(ageHours, 6);
}

/** (likes + comments * 2) / max(views, 1) */
export function computeEngagementRate(likes: number, comments: number, views: number): number {
  const v = Math.max(views, 0);
  const lk = Math.max(likes, 0);
  const cm = Math.max(comments, 0);
  return (lk + cm * 2) / Math.max(v, 1);
}
