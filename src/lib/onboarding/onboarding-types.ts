/** Shared onboarding / user profile types (client + server). */

export const ONBOARDING_STORAGE_VERSION = 1 as const;
export const ONBOARDING_DISMISSED_KEY = "viral:onboarding-dismissed";
export const ONBOARDING_DRAFT_KEY = "viral:onboarding-draft";
export const ONBOARDING_SESSION_DEFER_KEY = "viral:onboarding-deferred-session";

export const CREATOR_TYPE_OPTIONS = [
  "Эксперт",
  "Блогер",
  "Бизнес",
  "Онлайн-школа",
  "Агентство",
  "Маркетолог",
  "Контент-мейкер",
  "Другое",
] as const;

export const CONTENT_NICHE_OPTIONS = [
  "Бизнес",
  "Финансы",
  "Маркетинг",
  "Недвижимость",
  "Фитнес",
  "Психология",
  "Образование",
  "AI",
  "Авто",
  "Путешествия",
  "Другое",
] as const;

export type CreatorType = (typeof CREATOR_TYPE_OPTIONS)[number];
export type ContentNiche = (typeof CONTENT_NICHE_OPTIONS)[number];

export type UserOnboardingProfileData = {
  instagramUsername: string;
  tiktokUsername: string;
  youtubeChannel: string;
  creatorType: string;
  contentNiches: string[];
  referenceLinks: string[];
  onboardingDoneAt: string | null;
};

export type OnboardingDraft = {
  instagramUsername: string;
  tiktokUsername: string;
  youtubeChannel: string;
  creatorType: string;
  contentNiches: string[];
  referenceLinks: string;
};

export const EMPTY_ONBOARDING_DRAFT: OnboardingDraft = {
  instagramUsername: "",
  tiktokUsername: "",
  youtubeChannel: "",
  creatorType: "",
  contentNiches: [],
  referenceLinks: "",
};

export type RegistrationAction =
  | "search"
  | "load_more"
  | "save_video"
  | "competitor"
  | "script"
  | "transcribe"
  | "ai";

export const REGISTRATION_ACTION_LABELS: Record<RegistrationAction, string> = {
  search: "поиск роликов",
  load_more: "загрузку дополнительных роликов",
  save_video: "сохранение роликов",
  competitor: "шпион конкурентов",
  script: "генерацию сценариев",
  transcribe: "транскрибацию",
  ai: "AI-функции",
};

export const REGISTRATION_VALUE_MESSAGE =
  "Создайте аккаунт, чтобы искать вирусные ролики, сохранять результаты и использовать AI-инструменты ViralCloud.";

export type OnboardingIntroStep = {
  id: string;
  title: string;
  description: string;
  detail?: string;
  preview: "search" | "trends" | "competitors" | "scripts";
};

export const ONBOARDING_INTRO_STEPS: OnboardingIntroStep[] = [
  {
    id: "search",
    title: "AI-поиск",
    description: "Находите вирусные Shorts и Reels по нише, хукам и метрикам.",
    detail: "Фильтры по платформе, периоду и виральности — без ручного скролла.",
    preview: "search",
  },
  {
    id: "trends",
    title: "Живые тренды",
    description: "Смотрите, что набирает просмотры прямо сейчас.",
    detail: "Актуальные темы и хуки обновляются автоматически в боковой ленте.",
    preview: "trends",
  },
  {
    id: "competitors",
    title: "Шпион конкурентов",
    description: "Следите за аккаунтами конкурентов и их новыми роликами.",
    detail: "Просмотры, оценка виральности и свежие Reels — в одном экране.",
    preview: "competitors",
  },
  {
    id: "scripts",
    title: "AI-сценарии",
    description: "Генерируйте сценарии на основе реальных роликов и транскриптов.",
    detail: "Импортируйте референс из ленты — получите готовый сценарий в чате.",
    preview: "scripts",
  },
];
