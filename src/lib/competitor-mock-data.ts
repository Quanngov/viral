export type CompetitorAccount = {
  id: string;
  userId?: string;
  platform: "youtube" | "instagram" | "tiktok";
  username: string;
  profileUrl: string;
  avatarUrl?: string;
  displayName?: string;
  description?: string;
  addedAt: string;
  lastSyncedAt?: string;
  lastReelsPaginationToken?: string | null;
};

export type CompetitorVideo = {
  id: string;
  competitorId: string;
  platform: "youtube" | "instagram" | "tiktok";
  externalId?: string;
  url: string;
  title?: string;
  thumbnailUrl: string;
  caption?: string;
  description?: string | null;
  views: number;
  likes: number;
  comments: number;
  score: number;
  viralScore?: number;
  viewsPerHour?: number;
  engagementRate?: number;
  publishedAt: string;
  createdAt: string;
  durationSeconds?: number;
};

export const mockCompetitorAccounts: CompetitorAccount[] = [
  {
    id: "c1",
    platform: "instagram",
    username: "design_home",
    profileUrl: "https://instagram.com/design_home",
    displayName: "Design Home",
    description: "Интерьеры и домашний декор",
    addedAt: "2026-05-01T08:00:00.000Z",
  },
  {
    id: "c2",
    platform: "instagram",
    username: "reels_growth",
    profileUrl: "https://instagram.com/reels_growth",
    displayName: "Reels Growth",
    description: "Рост и контент-стратегии",
    addedAt: "2026-05-02T09:30:00.000Z",
  },
  {
    id: "c3",
    platform: "instagram",
    username: "fitness_daily",
    profileUrl: "https://instagram.com/fitness_daily",
    displayName: "Fitness Daily",
    description: "Фитнес и лайфстайл",
    addedAt: "2026-05-03T07:40:00.000Z",
  },
  {
    id: "c4",
    platform: "instagram",
    username: "interior_pro",
    profileUrl: "https://instagram.com/interior_pro",
    displayName: "Interior Pro",
    description: "Премиум-интерьеры",
    addedAt: "2026-05-04T12:00:00.000Z",
  },
];

export const mockCompetitorVideos: CompetitorVideo[] = [
  { id: "cv1", competitorId: "c1", platform: "instagram", url: "https://instagram.com/reel/cv1", thumbnailUrl: "https://picsum.photos/seed/cv1/540/720", caption: "Уютная кухня за 15 секунд", views: 154000, likes: 6200, comments: 184, score: 79, publishedAt: "2026-05-10T09:00:00.000Z", createdAt: "2026-05-10T09:05:00.000Z" },
  { id: "cv2", competitorId: "c2", platform: "instagram", url: "https://instagram.com/reel/cv2", thumbnailUrl: "https://picsum.photos/seed/cv2/540/720", caption: "3 хука для Reels", views: 234000, likes: 9400, comments: 320, score: 88, publishedAt: "2026-05-10T11:00:00.000Z", createdAt: "2026-05-10T11:05:00.000Z" },
  { id: "cv3", competitorId: "c3", platform: "instagram", url: "https://instagram.com/reel/cv3", thumbnailUrl: "https://picsum.photos/seed/cv3/540/720", caption: "Утренняя тренировка", views: 98000, likes: 4100, comments: 156, score: 67, publishedAt: "2026-05-09T08:00:00.000Z", createdAt: "2026-05-09T08:06:00.000Z" },
  { id: "cv4", competitorId: "c4", platform: "instagram", url: "https://instagram.com/reel/cv4", thumbnailUrl: "https://picsum.photos/seed/cv4/540/720", caption: "Трендовые цвета 2026", views: 278000, likes: 11300, comments: 410, score: 91, publishedAt: "2026-05-10T13:00:00.000Z", createdAt: "2026-05-10T13:09:00.000Z" },
  { id: "cv5", competitorId: "c1", platform: "instagram", url: "https://instagram.com/reel/cv5", thumbnailUrl: "https://picsum.photos/seed/cv5/540/720", caption: "Маленькая спальня: лайфхаки", views: 121000, likes: 5200, comments: 203, score: 74, publishedAt: "2026-05-08T12:00:00.000Z", createdAt: "2026-05-08T12:03:00.000Z" },
  { id: "cv6", competitorId: "c2", platform: "instagram", url: "https://instagram.com/reel/cv6", thumbnailUrl: "https://picsum.photos/seed/cv6/540/720", caption: "Сценарий продающего Reels", views: 314000, likes: 12900, comments: 505, score: 95, publishedAt: "2026-05-11T09:00:00.000Z", createdAt: "2026-05-11T09:02:00.000Z" },
  { id: "cv7", competitorId: "c3", platform: "instagram", url: "https://instagram.com/reel/cv7", thumbnailUrl: "https://picsum.photos/seed/cv7/540/720", caption: "Кардио 12 минут", views: 88000, likes: 3600, comments: 121, score: 63, publishedAt: "2026-05-07T07:00:00.000Z", createdAt: "2026-05-07T07:02:00.000Z" },
  { id: "cv8", competitorId: "c4", platform: "instagram", url: "https://instagram.com/reel/cv8", thumbnailUrl: "https://picsum.photos/seed/cv8/540/720", caption: "Ошибки в декоре гостиной", views: 176000, likes: 7200, comments: 268, score: 82, publishedAt: "2026-05-09T15:00:00.000Z", createdAt: "2026-05-09T15:05:00.000Z" },
  { id: "cv9", competitorId: "c1", platform: "instagram", url: "https://instagram.com/reel/cv9", thumbnailUrl: "https://picsum.photos/seed/cv9/540/720", caption: "Минимализм в ванной", views: 132000, likes: 5900, comments: 190, score: 76, publishedAt: "2026-05-10T16:00:00.000Z", createdAt: "2026-05-10T16:01:00.000Z" },
  { id: "cv10", competitorId: "c2", platform: "instagram", url: "https://instagram.com/reel/cv10", thumbnailUrl: "https://picsum.photos/seed/cv10/540/720", caption: "Как повысить удержание", views: 289000, likes: 11800, comments: 448, score: 90, publishedAt: "2026-05-08T10:00:00.000Z", createdAt: "2026-05-08T10:04:00.000Z" },
  { id: "cv11", competitorId: "c3", platform: "instagram", url: "https://instagram.com/reel/cv11", thumbnailUrl: "https://picsum.photos/seed/cv11/540/720", caption: "Питание после тренировки", views: 105000, likes: 4400, comments: 159, score: 69, publishedAt: "2026-05-06T10:00:00.000Z", createdAt: "2026-05-06T10:06:00.000Z" },
  { id: "cv12", competitorId: "c4", platform: "instagram", url: "https://instagram.com/reel/cv12", thumbnailUrl: "https://picsum.photos/seed/cv12/540/720", caption: "Освещение в спальне", views: 196000, likes: 7900, comments: 301, score: 84, publishedAt: "2026-05-10T19:00:00.000Z", createdAt: "2026-05-10T19:09:00.000Z" },
  { id: "cv13", competitorId: "c1", platform: "instagram", url: "https://instagram.com/reel/cv13", thumbnailUrl: "https://picsum.photos/seed/cv13/540/720", caption: "Тренд на деревянные панели", views: 162000, likes: 6800, comments: 220, score: 80, publishedAt: "2026-05-05T13:00:00.000Z", createdAt: "2026-05-05T13:02:00.000Z" },
  { id: "cv14", competitorId: "c2", platform: "instagram", url: "https://instagram.com/reel/cv14", thumbnailUrl: "https://picsum.photos/seed/cv14/540/720", caption: "Серия контента на месяц", views: 334000, likes: 13800, comments: 530, score: 96, publishedAt: "2026-05-11T08:00:00.000Z", createdAt: "2026-05-11T08:03:00.000Z" },
  { id: "cv15", competitorId: "c3", platform: "instagram", url: "https://instagram.com/reel/cv15", thumbnailUrl: "https://picsum.photos/seed/cv15/540/720", caption: "Растяжка для спины", views: 79000, likes: 3300, comments: 101, score: 60, publishedAt: "2026-05-04T08:00:00.000Z", createdAt: "2026-05-04T08:07:00.000Z" },
  { id: "cv16", competitorId: "c4", platform: "instagram", url: "https://instagram.com/reel/cv16", thumbnailUrl: "https://picsum.photos/seed/cv16/540/720", caption: "Зонирование студии", views: 208000, likes: 8600, comments: 325, score: 86, publishedAt: "2026-05-07T16:00:00.000Z", createdAt: "2026-05-07T16:03:00.000Z" },
  { id: "cv17", competitorId: "c1", platform: "instagram", url: "https://instagram.com/reel/cv17", thumbnailUrl: "https://picsum.photos/seed/cv17/540/720", caption: "Сканди интерьер за 10 шагов", views: 174000, likes: 7100, comments: 241, score: 81, publishedAt: "2026-05-08T18:00:00.000Z", createdAt: "2026-05-08T18:02:00.000Z" },
  { id: "cv18", competitorId: "c2", platform: "instagram", url: "https://instagram.com/reel/cv18", thumbnailUrl: "https://picsum.photos/seed/cv18/540/720", caption: "Разбор удачного превью", views: 241000, likes: 9600, comments: 390, score: 87, publishedAt: "2026-05-09T17:00:00.000Z", createdAt: "2026-05-09T17:01:00.000Z" },
  { id: "cv19", competitorId: "c3", platform: "instagram", url: "https://instagram.com/reel/cv19", thumbnailUrl: "https://picsum.photos/seed/cv19/540/720", caption: "Домашняя силовая", views: 113000, likes: 4700, comments: 170, score: 71, publishedAt: "2026-05-10T06:00:00.000Z", createdAt: "2026-05-10T06:04:00.000Z" },
  { id: "cv20", competitorId: "c4", platform: "instagram", url: "https://instagram.com/reel/cv20", thumbnailUrl: "https://picsum.photos/seed/cv20/540/720", caption: "Детали в современном интерьере", views: 226000, likes: 9100, comments: 347, score: 89, publishedAt: "2026-05-11T07:00:00.000Z", createdAt: "2026-05-11T07:02:00.000Z" },
];
