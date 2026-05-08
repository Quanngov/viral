/**
 * Bulk seed: многонишевое наполнение БД через YouTube API.
 * Запуск: npm run seed:youtube (нужны DATABASE_URL и YOUTUBE_API_KEY в .env.local)
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import type { Video } from "@prisma/client";
import { isPublishedWithinPeriod } from "@/lib/period-filter";
import { prisma } from "@/lib/prisma";
import type { ApiSort, PeriodApi } from "@/lib/search-query";
import {
  applyGarbagePenalty,
  computeRawScoreCore,
  computeRelevanceScore,
  hasGarbageKeywords,
  normalizeScores1to99,
} from "@/lib/scoring";
import { sortVideosList } from "@/lib/video-sort";
import {
  computeAgeHours,
  computeEngagementRate,
  computeViewsPerHour,
} from "@/lib/video-metrics";
import {
  fetchVideoDetails,
  parseYoutubeVideoItem,
  publishedAfterForPeriod,
  searchListOrder,
  searchYouTubeVideos,
  YouTubeApiError,
} from "@/lib/youtube";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnvLocal();

const MAX_SEARCHES_PER_RUN = 80;

const SEED_PERIOD: PeriodApi = "week";
const SEED_SORT: ApiSort = "viral_desc";

type SeedNicheBlock = {
  niche: string;
  language: string;
  region: string;
  keywords: string[];
};

const seedNiches: SeedNicheBlock[] = [
  {
    niche: "Дизайн интерьера",
    language: "ru",
    region: "RU",
    keywords: [
      "дизайн интерьера",
      "интерьер квартиры",
      "интерьер дома",
      "ремонт и дизайн",
      "идеи для интерьера",
      "современный интерьер",
      "дизайн кухни",
      "дизайн спальни",
      "дизайн гостиной",
      "интерьер маленькой квартиры",
    ],
  },
  {
    niche: "Ремонт квартир",
    language: "ru",
    region: "RU",
    keywords: [
      "ремонт квартиры",
      "ремонт квартир",
      "ремонт ванной",
      "ремонт кухни",
      "ремонт под ключ",
      "ошибки ремонта",
      "ремонт новостройки",
      "дизайн ремонт квартиры",
      "стройка ремонт",
      "ремонт своими руками",
    ],
  },
  {
    niche: "Продвижение в Instagram",
    language: "ru",
    region: "RU",
    keywords: [
      "продвижение в инстаграм",
      "продвижение в instagram",
      "продвижение reels",
      "как продвигать инстаграм",
      "как набрать подписчиков в инстаграм",
      "reels продвижение",
      "instagram marketing",
      "instagram growth",
      "instagram reels tips",
      "grow on instagram",
    ],
  },
  {
    niche: "Набор подписчиков / блогинг",
    language: "ru",
    region: "RU",
    keywords: [
      "как набрать подписчиков",
      "как стать блогером",
      "как развить блог",
      "личный бренд",
      "экспертный блог",
      "контент для блога",
      "блогинг",
      "рост подписчиков",
      "как вести блог",
      "контент план",
    ],
  },
  {
    niche: "Спорт / фитнес",
    language: "ru",
    region: "RU",
    keywords: [
      "фитнес",
      "тренировки дома",
      "тренировки в зале",
      "спорт мотивация",
      "похудение",
      "набор массы",
      "упражнения дома",
      "фитнес блог",
      "правильное питание",
      "workout tips",
    ],
  },
  {
    niche: "Тренды / вирусный контент",
    language: "ru",
    region: "RU",
    keywords: [
      "тренды reels",
      "тренды shorts",
      "тренды тикток",
      "вирусные видео",
      "viral hooks",
      "viral reels",
      "viral shorts",
      "трендовые видео",
      "как залететь в рекомендации",
      "тренды контента",
    ],
  },
  {
    niche: "Бизнес",
    language: "ru",
    region: "RU",
    keywords: [
      "бизнес",
      "малый бизнес",
      "бизнес идеи",
      "предпринимательство",
      "как открыть бизнес",
      "бизнес с нуля",
      "развитие бизнеса",
      "бизнес советы",
      "продажи в бизнесе",
      "business tips",
    ],
  },
  {
    niche: "Маркетинг / продажи",
    language: "ru",
    region: "RU",
    keywords: [
      "маркетинг",
      "продажи",
      "воронка продаж",
      "контент маркетинг",
      "smm маркетинг",
      "digital marketing",
      "как продавать",
      "прогрев аудитории",
      "маркетинговые фишки",
      "реклама бизнеса",
    ],
  },
  {
    niche: "Недвижимость",
    language: "ru",
    region: "RU",
    keywords: [
      "недвижимость",
      "продажа недвижимости",
      "риэлтор",
      "квартиры",
      "инвестиции в недвижимость",
      "новостройки",
      "ипотека",
      "купить квартиру",
      "недвижимость москва",
      "real estate tips",
    ],
  },
  {
    niche: "Красота / бьюти",
    language: "ru",
    region: "RU",
    keywords: [
      "бьюти",
      "макияж",
      "уход за кожей",
      "косметология",
      "салон красоты",
      "beauty tips",
      "skincare",
      "makeup tutorial",
      "уход за волосами",
      "маникюр",
    ],
  },
  {
    niche: "Образование / курсы",
    language: "ru",
    region: "RU",
    keywords: [
      "онлайн обучение",
      "онлайн курсы",
      "образование",
      "обучение",
      "как учиться",
      "курсы онлайн",
      "инфопродукты",
      "наставничество",
      "обучение профессии",
      "education tips",
    ],
  },
  {
    niche: "Нейросети / AI",
    language: "ru",
    region: "RU",
    keywords: [
      "нейросети",
      "chatgpt",
      "ai tools",
      "искусственный интеллект",
      "нейросети для бизнеса",
      "нейросети для контента",
      "ai для видео",
      "chatgpt tips",
      "ai marketing",
      "нейросети 2026",
    ],
  },
  {
    niche: "Финансы / инвестиции",
    language: "ru",
    region: "RU",
    keywords: [
      "финансы",
      "инвестиции",
      "личные финансы",
      "как копить деньги",
      "финансовая грамотность",
      "инвестиции для начинающих",
      "деньги",
      "заработок",
      "passive income",
      "finance tips",
    ],
  },
  {
    niche: "Еда / рестораны",
    language: "ru",
    region: "RU",
    keywords: [
      "ресторан",
      "кафе",
      "доставка еды",
      "рецепты",
      "food blog",
      "food reels",
      "кулинария",
      "домашние рецепты",
      "ресторанный бизнес",
      "еда",
    ],
  },
  {
    niche: "Видео / продакшен / монтаж",
    language: "ru",
    region: "RU",
    keywords: [
      "монтаж reels",
      "монтаж видео",
      "видеосъемка",
      "продакшен",
      "видео для бизнеса",
      "как снимать reels",
      "как снимать shorts",
      "video editing tips",
      "content creation",
      "short form content",
    ],
  },
];

type SeedTask = {
  niche: string;
  keyword: string;
  language: string;
  region: string;
};

function cacheKeyFrom(parts: {
  q: string;
  region: string;
  language: string;
  period: string;
  sort: string;
}) {
  return [parts.q, parts.region, parts.language, parts.period, parts.sort].join("|");
}

/** Раунд-робин по нишам, чтобы за один прогон затронуть все темы, а не только первые блоки. */
function buildSearchTasks(max: number): SeedTask[] {
  const tasks: SeedTask[] = [];
  let round = 0;
  while (tasks.length < max) {
    let anyAdded = false;
    for (const block of seedNiches) {
      if (tasks.length >= max) break;
      const kw = block.keywords[round];
      if (kw) {
        tasks.push({
          niche: block.niche,
          keyword: kw,
          language: block.language,
          region: block.region,
        });
        anyAdded = true;
      }
    }
    if (!anyAdded) break;
    round++;
  }
  return tasks;
}

type NicheStats = {
  searchedKeywords: number;
  savedVideos: number;
  updatedVideos: number;
};

async function runKeywordSearch(
  task: SeedTask,
  apiKey: string,
  now: Date,
  stats: Map<string, NicheStats>,
) {
  const qRaw = task.keyword.trim();
  const region = task.region.trim();
  const language = task.language.trim();
  const period = SEED_PERIOD;
  const sort = SEED_SORT;

  const ck = cacheKeyFrom({
    q: qRaw,
    region,
    language,
    period,
    sort,
  });

  const nicheStat = stats.get(task.niche)!;
  nicheStat.searchedKeywords += 1;

  const cached = await prisma.searchCache.findUnique({ where: { cacheKey: ck } });
  if (cached && cached.expiresAt > now) {
    return;
  }

  const publishedAfter = publishedAfterForPeriod(period);
  const order = searchListOrder(sort);

  const ids = await searchYouTubeVideos({
    query: qRaw,
    apiKey,
    maxResults: 50,
    regionCode: region || undefined,
    relevanceLanguage: language || undefined,
    publishedAfter,
    order,
  });

  const rawItems = await fetchVideoDetails(ids, apiKey);
  const parsed = rawItems
    .map(parseYoutubeVideoItem)
    .filter((v): v is NonNullable<typeof v> => Boolean(v))
    .filter((v) => v.durationSeconds > 0 && v.durationSeconds <= 60 && v.views >= 500)
    .filter((v) => isPublishedWithinPeriod(v.publishedAt, period, now));

  type Draft = {
    parsed: NonNullable<ReturnType<typeof parseYoutubeVideoItem>>;
    ageHours: number;
    viewsPerHour: number;
    engagementRate: number;
    relevanceScore: number;
    rawScore: number;
  };

  const drafts: Draft[] = [];

  for (const p of parsed) {
    const ageHours = computeAgeHours(p.publishedAt, now);
    const viewsPerHour = computeViewsPerHour(p.views, ageHours);
    const engagementRate = computeEngagementRate(p.likes, p.comments, p.views);
    const relevanceScore = computeRelevanceScore(
      qRaw,
      p.title,
      p.description ?? "",
      p.channelTitle ?? "",
    );
    let rawScore = computeRawScoreCore(p.views, viewsPerHour, engagementRate, relevanceScore);
    if (hasGarbageKeywords(p.title, p.description ?? "")) {
      rawScore = applyGarbagePenalty(rawScore);
    }
    drafts.push({
      parsed: p,
      ageHours,
      viewsPerHour,
      engagementRate,
      relevanceScore,
      rawScore,
    });
  }

  const positiveRel = drafts.filter((d) => d.relevanceScore > 0);
  const pool =
    positiveRel.length >= 6 ? positiveRel : [...drafts].sort((a, b) => b.rawScore - a.rawScore);

  const rawScores = pool.map((d) => d.rawScore);
  const normScores = normalizeScores1to99(rawScores);

  const fetchedAt = new Date();
  const saved: Video[] = [];

  for (let i = 0; i < pool.length; i++) {
    const d = pool[i];
    const p = d.parsed;
    const score = normScores[i] ?? 1;

    const existed = await prisma.video.findUnique({
      where: { youtubeVideoId: p.youtubeVideoId },
      select: { id: true },
    });

    const row = await prisma.video.upsert({
      where: { youtubeVideoId: p.youtubeVideoId },
      create: {
        youtubeVideoId: p.youtubeVideoId,
        platform: "youtube",
        url: p.url,
        title: p.title,
        description: p.description,
        channelId: p.channelId,
        channelTitle: p.channelTitle,
        thumbnailUrl: p.thumbnailUrl,
        publishedAt: p.publishedAt,
        durationSeconds: p.durationSeconds,
        views: p.views,
        likes: p.likes,
        comments: p.comments,
        language: (p.language ?? language) || null,
        region: region || null,
        niche: task.niche,
        sourceQuery: qRaw,
        ageHours: d.ageHours,
        relevanceScore: d.relevanceScore,
        rawScore: d.rawScore,
        score,
        viralScore: d.rawScore,
        viewsPerHour: d.viewsPerHour,
        engagementRate: d.engagementRate,
        lastFetchedAt: fetchedAt,
      },
      update: {
        url: p.url,
        title: p.title,
        description: p.description,
        channelId: p.channelId,
        channelTitle: p.channelTitle,
        thumbnailUrl: p.thumbnailUrl,
        publishedAt: p.publishedAt,
        durationSeconds: p.durationSeconds,
        views: p.views,
        likes: p.likes,
        comments: p.comments,
        language: (p.language ?? language) || null,
        region: region || null,
        niche: task.niche,
        sourceQuery: qRaw,
        ageHours: d.ageHours,
        relevanceScore: d.relevanceScore,
        rawScore: d.rawScore,
        score,
        viralScore: d.rawScore,
        viewsPerHour: d.viewsPerHour,
        engagementRate: d.engagementRate,
        lastFetchedAt: fetchedAt,
      },
    });
    saved.push(row);

    if (existed) nicheStat.updatedVideos += 1;
    else nicheStat.savedVideos += 1;
  }

  const sorted = sortVideosList(saved, sort);
  const sortedIds = sorted.map((v) => v.youtubeVideoId);
  const expiresAt = new Date(now.getTime() + 12 * 3600 * 1000);

  await prisma.searchCache.upsert({
    where: { cacheKey: ck },
    create: {
      cacheKey: ck,
      query: qRaw,
      region: region || null,
      language: language || null,
      period,
      sort,
      videoIdsJson: JSON.stringify(sortedIds),
      expiresAt,
    },
    update: {
      query: qRaw,
      region: region || null,
      language: language || null,
      period,
      sort,
      videoIdsJson: JSON.stringify(sortedIds),
      expiresAt,
    },
  });
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    console.error("Задайте YOUTUBE_API_KEY в .env.local");
    process.exit(1);
  }

  const tasks = buildSearchTasks(MAX_SEARCHES_PER_RUN);
  console.log(`Задач поиска: ${tasks.length} (макс. ${MAX_SEARCHES_PER_RUN}), период=${SEED_PERIOD}, sort=${SEED_SORT}`);

  const stats = new Map<string, NicheStats>();
  for (const block of seedNiches) {
    stats.set(block.niche, { searchedKeywords: 0, savedVideos: 0, updatedVideos: 0 });
  }

  const now = new Date();

  for (const task of tasks) {
    try {
      await runKeywordSearch(task, apiKey, now, stats);
    } catch (e) {
      if (e instanceof YouTubeApiError) {
        console.error(`[${task.niche}] «${task.keyword}»: ${e.message}`);
      } else {
        console.error(`[${task.niche}] «${task.keyword}»:`, e);
      }
    }
  }

  console.log("\n--- Статистика по нишам ---\n");
  for (const block of seedNiches) {
    const s = stats.get(block.niche)!;
    console.log(`niche: ${block.niche}`);
    console.log(`  searchedKeywords: ${s.searchedKeywords}`);
    console.log(`  savedVideos: ${s.savedVideos}`);
    console.log(`  updatedVideos: ${s.updatedVideos}`);
    console.log("");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
