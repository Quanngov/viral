export type LiveTrendVideo = {
  id: string;
  title: string;
  views: string;
  thumbnailUrl: string;
  type?: "Shorts" | "Long";
};

export type WeeklyTrend = {
  id: string;
  title: string;
  description: string;
  category: string;
  videoCount: number;
};

export type GridVideo = {
  id: string;
  platform?: "youtube" | "instagram";
  youtubeId?: string | null;
  videoUrl?: string | null;
  title: string;
  channel: string;
  description?: string;
  views: string;
  likes: string;
  shares?: number;
  /** Полное относительное время (панель). */
  publishedAt: string;
  publishedAtIso?: string;
  /** Короткий возраст для карточки. */
  ageCompact?: string;
  summary?: string;
  viralScore: number;
  rating: number;
  score?: number;
  viralLabel: "High Viral" | "Rising" | "Stable";
  thumbnailUrl: string;
  url?: string;
  comments?: number;
  viewsPerHour?: number;
  engagementRate?: number;
  language?: string | null;
  region?: string | null;
};

export type MockUser = {
  email: string;
  plan: string;
  tokens: number;
};

export const mockUser: MockUser = {
  email: "creator@studio.media",
  plan: "Pro",
  tokens: 12400,
};

export const mockLiveTrends: LiveTrendVideo[] = [
  {
    id: "l1",
    title: "Как я набрал 1M за неделю без бюджета",
    views: "892K",
    type: "Shorts",
    thumbnailUrl: "https://picsum.photos/seed/lv1/72/128",
  },
  {
    id: "l2",
    title: "Тренд «до/после» в нише фитнеса — разбор",
    views: "1.2M",
    type: "Shorts",
    thumbnailUrl: "https://picsum.photos/seed/lv2/72/128",
  },
  {
    id: "l3",
    title: "Один кадр — миллион просмотров: секрет монтажа",
    views: "654K",
    type: "Long",
    thumbnailUrl: "https://picsum.photos/seed/lv3/72/128",
  },
  {
    id: "l4",
    title: "Хук за 1 секунду: формула для Shorts",
    views: "2.1M",
    type: "Shorts",
    thumbnailUrl: "https://picsum.photos/seed/lv4/72/128",
  },
  {
    id: "l5",
    title: "Ниша маркетинга: что залетает в мае",
    views: "445K",
    type: "Long",
    thumbnailUrl: "https://picsum.photos/seed/lv5/72/128",
  },
  {
    id: "l6",
    title: "Storytelling за 15 секунд — живой кейс",
    views: "980K",
    type: "Shorts",
    thumbnailUrl: "https://picsum.photos/seed/lv6/72/128",
  },
  {
    id: "l7",
    title: "Топ-3 ошибки в первых 3 секундах ролика",
    views: "332K",
    type: "Shorts",
    thumbnailUrl: "https://picsum.photos/seed/lv7/72/128",
  },
  {
    id: "l8",
    title: "Формат «вопрос аудитории» — рост удержания",
    views: "567K",
    type: "Long",
    thumbnailUrl: "https://picsum.photos/seed/lv8/72/128",
  },
  {
    id: "l9",
    title: "Трендовый звук + простой визуал = виральность",
    views: "1.5M",
    type: "Shorts",
    thumbnailUrl: "https://picsum.photos/seed/lv9/72/128",
  },
];

export const mockWeeklyTrends: WeeklyTrend[] = [
  {
    id: "w1",
    title: "Хуки, которые сейчас залетают",
    description:
      "Подборка открытий с высоким CTR и быстрым набором охвата за последние 7 дней.",
    category: "Хуки",
    videoCount: 48,
  },
  {
    id: "w2",
    title: "Тренды в нише маркетинга",
    description:
      "Форматы и темы, которые стабильно дают рост в B2B и личном бренде.",
    category: "Маркетинг",
    videoCount: 36,
  },
  {
    id: "w3",
    title: "Лучшие Shorts недели",
    description:
      "Короткие ролики с лучшим балансом досмотров, шеров и комментариев.",
    category: "Shorts",
    videoCount: 52,
  },
];

export const mockVideos: GridVideo[] = [
  {
    id: "g1",
    title: "Сценарий продукта за 60 секунд — шаблон + пример",
    channel: "Growth Lab",
    views: "3.4M",
    likes: "214K",
    publishedAt: "2 дня назад",
    summary:
      "Разбор структуры: проблема → доказательство → CTA. Подходит для запусков и обновлений продукта.",
    viralScore: 94,
    rating: 94,
    viralLabel: "High Viral",
    thumbnailUrl: "https://picsum.photos/seed/gv1/480/640",
  },
  {
    id: "g2",
    title: "Почему этот хук сработал в трёх нишах сразу",
    channel: "Viral Notes",
    views: "1.1M",
    likes: "89K",
    publishedAt: "5 дней назад",
    summary:
      "Универсальный заход через любопытство и контраст ожиданий — можно адаптировать под вашу нишу.",
    viralScore: 81,
    rating: 81,
    viralLabel: "Rising",
    thumbnailUrl: "https://picsum.photos/seed/gv2/480/640",
  },
  {
    id: "g3",
    title: "Мини-док о бренде за один день съёмок",
    channel: "Studio North",
    views: "892K",
    likes: "62K",
    publishedAt: "1 неделю назад",
    summary:
      "Локации, свет и монтажные приёмы, которые экономят время без потери «дорогого» кадра.",
    viralScore: 76,
    rating: 76,
    viralLabel: "Stable",
    thumbnailUrl: "https://picsum.photos/seed/gv3/480/640",
  },
  {
    id: "g4",
    title: "Тренд недели: «ожидание vs реальность» в SaaS",
    channel: "Product Pulse",
    views: "2.8M",
    likes: "178K",
    publishedAt: "3 дня назад",
    summary:
      "Комичное напряжение между обещанием интерфейса и реальным UX — высокий шер в B2B.",
    viralScore: 91,
    rating: 91,
    viralLabel: "High Viral",
    thumbnailUrl: "https://picsum.photos/seed/gv4/480/640",
  },
  {
    id: "g5",
    title: "Как упаковать экспертность без «продажного» тона",
    channel: "Creator Desk",
    views: "504K",
    likes: "41K",
    publishedAt: "4 дня назад",
    summary:
      "Спокойный авторитет через кейсы и короткие инсайты — формат для длинного удержания.",
    viralScore: 72,
    rating: 72,
    viralLabel: "Rising",
    thumbnailUrl: "https://picsum.photos/seed/gv5/480/640",
  },
  {
    id: "g6",
    title: "Один свет, два объектива — кино на телефоне",
    channel: "Frame Daily",
    views: "6.2M",
    likes: "402K",
    publishedAt: "1 день назад",
    summary:
      "Техника разделения планов и контрового света с минимальным набором оборудования.",
    viralScore: 96,
    rating: 99,
    viralLabel: "High Viral",
    thumbnailUrl: "https://picsum.photos/seed/gv6/480/640",
  },
  {
    id: "g7",
    title: "Разбор вирального Shorts: структура и монтаж",
    channel: "Shorts Radar",
    views: "1.9M",
    likes: "124K",
    publishedAt: "6 дней назад",
    summary:
      "Темп монтажа, звуковые акценты и точки удержания зрителя на каждые 2–3 секунды.",
    viralScore: 85,
    rating: 85,
    viralLabel: "Rising",
    thumbnailUrl: "https://picsum.photos/seed/gv7/480/640",
  },
  {
    id: "g8",
    title: "Чеклист контента на неделю из трендовой ленты",
    channel: "Trend Ops",
    views: "743K",
    likes: "58K",
    publishedAt: "2 недели назад",
    summary:
      "Готовый набор тем и форматов под смешанный контент-план: Shorts, длинные и эфиры.",
    viralScore: 68,
    rating: 42,
    viralLabel: "Stable",
    thumbnailUrl: "https://picsum.photos/seed/gv8/480/640",
  },
];
