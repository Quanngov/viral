export type ApiSort =
  | "views_desc"
  | "views_asc"
  | "date_desc"
  | "date_asc"
  | "viral_desc"
  | "viral_asc";

export type PeriodApi = "today" | "yesterday" | "week" | "month" | "year" | "all";

const PERIOD_UI_TO_API: Record<string, PeriodApi> = {
  Сегодня: "today",
  Вчера: "yesterday",
  Неделя: "week",
  Месяц: "month",
  Год: "year",
  "Все время": "all",
};

export function uiPeriodToApi(periodLabel: string): PeriodApi {
  return PERIOD_UI_TO_API[periodLabel] ?? "week";
}

export function uiLocaleToApi(localeLabel: string): {
  region?: string;
  language?: string;
} {
  if (localeLabel === "Русский") return { region: "RU", language: "ru" };
  if (localeLabel === "Английский") return { region: "US", language: "en" };
  return {};
}
