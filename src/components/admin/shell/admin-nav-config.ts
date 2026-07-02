export type AdminSectionId =
  | "overview"
  | "analytics"
  | "users"
  | "subscriptions"
  | "plans"
  | "tokens"
  | "billing"
  | "videos"
  | "video-processing"
  | "scrapers"
  | "ai-models"
  | "prompts"
  | "search"
  | "trends"
  | "discovery"
  | "queues"
  | "jobs"
  | "providers"
  | "costs"
  | "logs"
  | "errors"
  | "monitoring"
  | "health"
  | "api-keys"
  | "flags"
  | "settings";

export type AdminNavItem = {
  id: AdminSectionId;
  label: string;
  href: string;
  description: string;
  /** live = wired to real APIs/data today */
  status: "live" | "preview";
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Платформа",
    items: [
      {
        id: "overview",
        label: "Обзор",
        href: "/admin/overview",
        description: "Сводка здоровья платформы и ключевые метрики",
        status: "live",
      },
      {
        id: "analytics",
        label: "Аналитика",
        href: "/admin/analytics",
        description: "Поиски, индексация, токены, конверсия",
        status: "live",
      },
    ],
  },
  {
    label: "Пользователи и биллинг",
    items: [
      {
        id: "users",
        label: "Пользователи",
        href: "/admin/users",
        description: "Поиск, подписки, баланс, модерация",
        status: "preview",
      },
      {
        id: "subscriptions",
        label: "Подписки",
        href: "/admin/subscriptions",
        description: "Активные подписки и trial",
        status: "preview",
      },
      {
        id: "plans",
        label: "Тарифы",
        href: "/admin/plans",
        description: "Лимиты, цены, функции планов",
        status: "live",
      },
      {
        id: "tokens",
        label: "Токены",
        href: "/admin/tokens",
        description: "Стоимость действий и пакеты",
        status: "live",
      },
      {
        id: "billing",
        label: "Биллинг",
        href: "/admin/billing",
        description: "MRR, выручка, движение токенов",
        status: "live",
      },
      {
        id: "costs",
        label: "Затраты",
        href: "/admin/costs",
        description: "AI cost, провайдеры, unit economics",
        status: "preview",
      },
    ],
  },
  {
    label: "Контент",
    items: [
      {
        id: "videos",
        label: "Видео",
        href: "/admin/videos",
        description: "База роликов, фильтры, детали",
        status: "live",
      },
      {
        id: "video-processing",
        label: "Обработка видео",
        href: "/admin/video-processing",
        description: "Транскрипция, обложки, валидация",
        status: "preview",
      },
      {
        id: "scrapers",
        label: "Скраперы",
        href: "/admin/scrapers",
        description: "YouTube, Instagram ingest",
        status: "preview",
      },
    ],
  },
  {
    label: "AI",
    items: [
      {
        id: "ai-models",
        label: "AI-модели",
        href: "/admin/ai-models",
        description: "DeepSeek, Groq Whisper, маршрутизация",
        status: "live",
      },
      {
        id: "prompts",
        label: "Prompt Manager",
        href: "/admin/prompts",
        description: "Редактирование и версии промптов",
        status: "live",
      },
    ],
  },
  {
    label: "Discovery",
    items: [
      {
        id: "trends",
        label: "Realtime Trends",
        href: "/admin/trends",
        description: "Очередь публикации трендов",
        status: "live",
      },
      {
        id: "discovery",
        label: "Discovery Pipeline",
        href: "/admin/discovery",
        description: "Детектор кандидатов, задержки release",
        status: "preview",
      },
      {
        id: "search",
        label: "Поиск",
        href: "/admin/search",
        description: "Feed, ранжирование, периоды",
        status: "preview",
      },
      {
        id: "queues",
        label: "Очереди",
        href: "/admin/queues",
        description: "Trend queue, ingest backlog",
        status: "live",
      },
    ],
  },
  {
    label: "Система",
    items: [
      {
        id: "jobs",
        label: "Фоновые задачи",
        href: "/admin/jobs",
        description: "Cron, sync, lazy refresh",
        status: "preview",
      },
      {
        id: "providers",
        label: "Провайдеры",
        href: "/admin/providers",
        description: "Статус API-ключей и внешних сервисов",
        status: "live",
      },
      {
        id: "logs",
        label: "Логи",
        href: "/admin/logs",
        description: "Консоль событий платформы",
        status: "live",
      },
      {
        id: "errors",
        label: "Ошибки",
        href: "/admin/errors",
        description: "Агрегированные error-события",
        status: "preview",
      },
      {
        id: "monitoring",
        label: "Мониторинг",
        href: "/admin/monitoring",
        description: "Sentry, алерты, SLA",
        status: "preview",
      },
      {
        id: "health",
        label: "System Health",
        href: "/admin/health",
        description: "БД, кэш, storage",
        status: "live",
      },
      {
        id: "api-keys",
        label: "API Keys",
        href: "/admin/api-keys",
        description: "Управление ключами (без значений)",
        status: "preview",
      },
      {
        id: "flags",
        label: "Feature Flags",
        href: "/admin/flags",
        description: "Постепенный rollout функций",
        status: "preview",
      },
      {
        id: "settings",
        label: "Настройки",
        href: "/admin/settings",
        description: "Глобальные параметры платформы",
        status: "preview",
      },
    ],
  },
];

export const ADMIN_SECTIONS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

export function adminSectionFromPath(pathname: string): AdminSectionId {
  const seg = pathname.replace(/^\/admin\/?/, "").split("/")[0];
  const found = ADMIN_SECTIONS.find((s) => s.id === seg);
  return found?.id ?? "overview";
}

export function adminHref(path: string, adminKey: string | null): string {
  if (!adminKey) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}key=${encodeURIComponent(adminKey)}`;
}
