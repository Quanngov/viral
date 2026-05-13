/** Максимум профилей конкурентов на пользователя. */
export const MAX_COMPETITORS_PER_USER = 10;

/** Списание за дневной доступ к одному профилю (Instagram и YouTube одинаково). */
export const COMPETITOR_DAILY_SYNC_TOKEN_COST = Number(
  process.env.COMPETITOR_DAILY_SYNC_TOKEN_COST ?? "5",
);

/** Сколько профилей обновлять внешним API за один вызов action=initial. */
export const DAILY_SYNC_INITIAL_PROFILE_CAP = 3;

/** Сколько профилей за один вызов action=more (2–3). */
export const DAILY_SYNC_MORE_PROFILE_CAP = 3;

/** Сколько последних роликов из БД учитывать при выборе приоритетных профилей (initial). */
export const DAILY_SYNC_DEFAULT_VISIBLE_VIDEO_LIMIT = 16;
